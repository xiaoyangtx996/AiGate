package knowledge

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/jobs"
	"github.com/xiaoyangtx996/AiGate/internal/rag"
	"github.com/xiaoyangtx996/AiGate/internal/storage"
)

type accessStub bool

func (a accessStub) HasProjectAccess(context.Context, string, string, string) (bool, error) {
	return bool(a), nil
}

type queueStub struct{ job jobs.Job }

func (q *queueStub) Enqueue(_ context.Context, j jobs.Job) error { q.job = j; return nil }
func (*queueStub) Claim(context.Context, string, time.Duration, []string) (jobs.Job, error) {
	return jobs.Job{}, jobs.ErrNoJob
}
func (*queueStub) Complete(context.Context, string, string) error              { return nil }
func (*queueStub) Fail(context.Context, jobs.Job, string, time.Duration) error { return nil }

type repoStub struct {
	kb     KnowledgeBase
	doc    Document
	chunks []Chunk
}

func (r *repoStub) CreateKnowledgeBase(_ context.Context, k KnowledgeBase) error {
	r.kb = k
	return nil
}
func (r *repoStub) GetKnowledgeBase(context.Context, string, string, string) (KnowledgeBase, error) {
	if r.kb.ID == "" {
		return KnowledgeBase{}, ErrNotFound
	}
	return r.kb, nil
}
func (r *repoStub) CreateDocument(_ context.Context, d Document) error { r.doc = d; return nil }
func (r *repoStub) GetDocument(context.Context, string, string, string) (Document, error) {
	if r.doc.ID == "" {
		return Document{}, ErrNotFound
	}
	return r.doc, nil
}
func (r *repoStub) MarkProcessing(context.Context, string, string, string) error {
	r.doc.Status = "processing"
	return nil
}
func (r *repoStub) ReplaceChunksAndMarkReady(_ context.Context, d Document, c []Chunk) error {
	r.chunks = c
	r.doc.Status = "ready"
	return nil
}
func (r *repoStub) MarkFailed(_ context.Context, _, _, _, message string) error {
	r.doc.Status = "failed"
	r.doc.LastError = message
	return nil
}
func (r *repoStub) RequeueDocument(context.Context, string, string, string) error {
	if r.doc.Status != "failed" {
		return ErrNotFound
	}
	r.doc.Status = "queued"
	return nil
}

func TestUploadQueuesAndWorkerMarksReady(t *testing.T) {
	repo := &repoStub{}
	queue := &queueStub{}
	svc := NewService(repo, accessStub(true), storage.Local{Root: t.TempDir(), MaxBytes: 1024}, queue, rag.HashEmbedder{})
	kb, err := svc.Create(context.Background(), "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", "33333333-3333-3333-3333-333333333333", "docs")
	if err != nil {
		t.Fatal(err)
	}
	doc, err := svc.Upload(context.Background(), kb.TenantID, kb.ProjectID, kb.ID, kb.CreatedBy, "guide.md", "text/markdown", strings.NewReader("AiGate project knowledge citation"))
	if err != nil {
		t.Fatal(err)
	}
	if queue.job.Type != ProcessJobType || doc.Status != "queued" {
		t.Fatalf("job=%+v doc=%+v", queue.job, doc)
	}
	if err := svc.Handler(context.Background(), queue.job); err != nil {
		t.Fatal(err)
	}
	if repo.doc.Status != "ready" || len(repo.chunks) != 1 || repo.chunks[0].SpanStart != 0 || repo.chunks[0].SpanEnd == 0 {
		t.Fatalf("doc=%+v chunks=%+v", repo.doc, repo.chunks)
	}
}

func TestUploadDeniedBeforeStorage(t *testing.T) {
	svc := NewService(&repoStub{}, accessStub(false), storage.Local{Root: t.TempDir()}, &queueStub{}, rag.HashEmbedder{})
	_, err := svc.Upload(context.Background(), "t", "other-project", "kb", "u", "x.md", "text/markdown", strings.NewReader("secret"))
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("got %v", err)
	}
}

func TestFailedDocumentCanRetry(t *testing.T) {
	repo := &repoStub{doc: Document{ID: "d", TenantID: "t", ProjectID: "p", Status: "failed"}}
	queue := &queueStub{}
	svc := NewService(repo, accessStub(true), nil, queue, rag.HashEmbedder{})
	if err := svc.Retry(context.Background(), "t", "p", "d", "u"); err != nil {
		t.Fatal(err)
	}
	var payload map[string]string
	_ = json.Unmarshal(queue.job.Payload, &payload)
	if repo.doc.Status != "queued" || payload["DocumentID"] != "d" {
		t.Fatalf("doc=%+v payload=%v", repo.doc, payload)
	}
}

var _ io.Reader = strings.NewReader("")
