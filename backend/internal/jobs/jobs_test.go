package jobs

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeQueue struct {
	job       Job
	completed bool
	failed    bool
}

func (q *fakeQueue) Enqueue(context.Context, Job) error { return nil }
func (q *fakeQueue) Claim(context.Context, string, time.Duration, []string) (Job, error) {
	if q.job.ID == "" {
		return Job{}, ErrNoJob
	}
	return q.job, nil
}
func (q *fakeQueue) Complete(context.Context, string, string) error { q.completed = true; return nil }
func (q *fakeQueue) Fail(context.Context, Job, string, time.Duration) error {
	q.failed = true
	return nil
}

func TestRunnerCompletesAndRetries(t *testing.T) {
	q := &fakeQueue{job: Job{ID: "1", Type: "ok", LockedBy: "w", Attempts: 1, MaxAttempts: 3}}
	r := Runner{Queue: q, WorkerID: "w", Lease: time.Second, Handlers: map[string]Handler{"ok": func(context.Context, Job) error { return nil }}}
	if err := r.RunOnce(context.Background()); err != nil || !q.completed {
		t.Fatalf("err=%v completed=%v", err, q.completed)
	}
	q.completed = false
	q.job.Type = "bad"
	r.Handlers["bad"] = func(context.Context, Job) error { return errors.New("failed") }
	if err := r.RunOnce(context.Background()); err != nil || !q.failed {
		t.Fatalf("err=%v failed=%v", err, q.failed)
	}
}
