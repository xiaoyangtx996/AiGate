package knowledge

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/xiaoyangtx996/AiGate/internal/domain"
	"github.com/xiaoyangtx996/AiGate/internal/jobs"
)

const ProcessJobType = "knowledge.process_document"

var (
	ErrForbidden = errors.New("project access denied")
	ErrNotFound  = errors.New("knowledge resource not found")
)

type KnowledgeBase struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	CreatedBy string    `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Document struct {
	ID              string    `json:"id"`
	TenantID        string    `json:"tenant_id"`
	ProjectID       string    `json:"project_id"`
	KnowledgeBaseID string    `json:"knowledge_base_id"`
	Filename        string    `json:"filename"`
	MediaType       string    `json:"media_type"`
	ObjectKey       string    `json:"-"`
	Status          string    `json:"status"`
	LastError       string    `json:"last_error,omitempty"`
	CreatedBy       string    `json:"created_by"`
	SizeBytes       int64     `json:"size_bytes"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Chunk struct {
	ID, TenantID, ProjectID, KnowledgeBaseID, DocumentID string
	Index, SpanStart, SpanEnd                            int
	Content                                              string
	Embedding                                            []float32
}

type Access interface {
	HasProjectAccess(context.Context, string, string, string) (bool, error)
}
type Repository interface {
	CreateKnowledgeBase(context.Context, KnowledgeBase) error
	GetKnowledgeBase(context.Context, string, string, string) (KnowledgeBase, error)
	CreateDocument(context.Context, Document) error
	GetDocument(context.Context, string, string, string) (Document, error)
	MarkProcessing(context.Context, string, string, string) error
	ReplaceChunksAndMarkReady(context.Context, Document, []Chunk) error
	MarkFailed(context.Context, string, string, string, string) error
	RequeueDocument(context.Context, string, string, string) error
}
type ObjectStore interface {
	Put(context.Context, string, io.Reader) (int64, error)
	Open(context.Context, string) (io.ReadCloser, error)
}
type Embedder interface {
	Embed(context.Context, string) ([]float32, error)
}

type Service struct {
	repo     Repository
	access   Access
	objects  ObjectStore
	queue    jobs.Queue
	embedder Embedder
}

func NewService(repo Repository, access Access, objects ObjectStore, queue jobs.Queue, embedder Embedder) *Service {
	return &Service{repo: repo, access: access, objects: objects, queue: queue, embedder: embedder}
}

func (s *Service) Create(ctx context.Context, tenantID, projectID, userID, name string) (KnowledgeBase, error) {
	if err := s.authorize(ctx, tenantID, projectID, userID); err != nil {
		return KnowledgeBase{}, err
	}
	id, err := domain.NewID()
	if err != nil {
		return KnowledgeBase{}, err
	}
	kb := KnowledgeBase{ID: id, TenantID: tenantID, ProjectID: projectID, Name: strings.TrimSpace(name), CreatedBy: userID}
	if kb.Name == "" {
		return KnowledgeBase{}, errors.New("name is required")
	}
	if err := s.repo.CreateKnowledgeBase(ctx, kb); err != nil {
		return KnowledgeBase{}, err
	}
	return s.repo.GetKnowledgeBase(ctx, tenantID, projectID, id)
}

func (s *Service) Upload(ctx context.Context, tenantID, projectID, kbID, userID, filename, mediaType string, body io.Reader) (Document, error) {
	if err := s.authorize(ctx, tenantID, projectID, userID); err != nil {
		return Document{}, err
	}
	if _, err := s.repo.GetKnowledgeBase(ctx, tenantID, projectID, kbID); err != nil {
		return Document{}, err
	}
	mediaType = strings.Split(mediaType, ";")[0]
	if mediaType == "" {
		mediaType = mediaTypeFor(filename)
	}
	if !allowedMediaType(mediaType) {
		return Document{}, errors.New("only Markdown, plain text, or PDF is supported")
	}
	id, err := domain.NewID()
	if err != nil {
		return Document{}, err
	}
	key := filepath.ToSlash(filepath.Join(tenantID, projectID, kbID, id))
	size, err := s.objects.Put(ctx, key, body)
	if err != nil {
		return Document{}, err
	}
	doc := Document{ID: id, TenantID: tenantID, ProjectID: projectID, KnowledgeBaseID: kbID, Filename: filepath.Base(filename), MediaType: mediaType, ObjectKey: key, SizeBytes: size, Status: "queued", CreatedBy: userID}
	if err := s.repo.CreateDocument(ctx, doc); err != nil {
		return Document{}, err
	}
	if err := s.enqueue(ctx, doc); err != nil {
		_ = s.repo.MarkFailed(ctx, tenantID, projectID, id, err.Error())
		return Document{}, err
	}
	return s.repo.GetDocument(ctx, tenantID, projectID, id)
}

func (s *Service) Status(ctx context.Context, tenantID, projectID, documentID, userID string) (Document, error) {
	if err := s.authorize(ctx, tenantID, projectID, userID); err != nil {
		return Document{}, err
	}
	return s.repo.GetDocument(ctx, tenantID, projectID, documentID)
}

func (s *Service) Retry(ctx context.Context, tenantID, projectID, documentID, userID string) error {
	if err := s.authorize(ctx, tenantID, projectID, userID); err != nil {
		return err
	}
	doc, err := s.repo.GetDocument(ctx, tenantID, projectID, documentID)
	if err != nil {
		return err
	}
	if err := s.repo.RequeueDocument(ctx, tenantID, projectID, documentID); err != nil {
		return err
	}
	return s.enqueue(ctx, doc)
}

func (s *Service) Handler(ctx context.Context, job jobs.Job) (err error) {
	var payload struct{ TenantID, ProjectID, DocumentID string }
	if err = json.Unmarshal(job.Payload, &payload); err != nil {
		return err
	}
	doc, err := s.repo.GetDocument(ctx, payload.TenantID, payload.ProjectID, payload.DocumentID)
	if err != nil {
		return err
	}
	if err = s.repo.MarkProcessing(ctx, doc.TenantID, doc.ProjectID, doc.ID); err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = s.repo.MarkFailed(ctx, doc.TenantID, doc.ProjectID, doc.ID, err.Error())
		}
	}()
	r, err := s.objects.Open(ctx, doc.ObjectKey)
	if err != nil {
		return err
	}
	defer r.Close()
	raw, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	body, err := extractPlainText(doc.MediaType, raw)
	if err != nil {
		return err
	}
	spans := split(body, 1200, 200)
	chunks := make([]Chunk, 0, len(spans))
	for i, span := range spans {
		vector, e := s.embedder.Embed(ctx, string(body[span[0]:span[1]]))
		if e != nil {
			return e
		}
		id, e := domain.NewID()
		if e != nil {
			return e
		}
		chunks = append(chunks, Chunk{ID: id, TenantID: doc.TenantID, ProjectID: doc.ProjectID, KnowledgeBaseID: doc.KnowledgeBaseID, DocumentID: doc.ID, Index: i, SpanStart: span[0], SpanEnd: span[1], Content: string(body[span[0]:span[1]]), Embedding: vector})
	}
	return s.repo.ReplaceChunksAndMarkReady(ctx, doc, chunks)
}

func (s *Service) authorize(ctx context.Context, tenantID, projectID, userID string) error {
	allowed, err := s.access.HasProjectAccess(ctx, tenantID, projectID, userID)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrForbidden
	}
	return nil
}
func (s *Service) enqueue(ctx context.Context, doc Document) error {
	payload, _ := json.Marshal(map[string]string{"TenantID": doc.TenantID, "ProjectID": doc.ProjectID, "DocumentID": doc.ID})
	return s.queue.Enqueue(ctx, jobs.Job{TenantID: doc.TenantID, Type: ProcessJobType, Payload: payload, MaxAttempts: 5})
}
func allowedMediaType(mediaType string) bool {
	switch mediaType {
	case "text/markdown", "text/plain", "application/pdf":
		return true
	default:
		return false
	}
}

func mediaTypeFor(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".md", ".markdown":
		return "text/markdown"
	case ".txt":
		return "text/plain"
	case ".pdf":
		return "application/pdf"
	}
	return ""
}
func split(body []byte, size, overlap int) [][2]int {
	var out [][2]int
	for start := 0; start < len(body); {
		end := min(start+size, len(body))
		out = append(out, [2]int{start, end})
		if end == len(body) {
			break
		}
		start = end - overlap
	}
	return out
}
