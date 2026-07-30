package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

var ErrNoJob = errors.New("no job available")

type Job struct {
	ID, TenantID, Type, Status, LockedBy, LastError string
	Payload                                         json.RawMessage
	Attempts, MaxAttempts                           int
	AvailableAt, LockedUntil, CreatedAt, UpdatedAt  time.Time
}

type Queue interface {
	Enqueue(context.Context, Job) error
	Claim(context.Context, string, time.Duration, []string) (Job, error)
	Complete(context.Context, string, string) error
	Fail(context.Context, Job, string, time.Duration) error
}

type Handler func(context.Context, Job) error

type Runner struct {
	Queue    Queue
	WorkerID string
	Lease    time.Duration
	Handlers map[string]Handler
}

func (r *Runner) RunOnce(ctx context.Context) error {
	types := make([]string, 0, len(r.Handlers))
	for jobType := range r.Handlers {
		types = append(types, jobType)
	}
	job, err := r.Queue.Claim(ctx, r.WorkerID, r.Lease, types)
	if err != nil {
		return err
	}
	handler := r.Handlers[job.Type]
	if handler == nil {
		err = fmt.Errorf("no handler for job type %q", job.Type)
	} else {
		err = handler(ctx, job)
	}
	if err == nil {
		return r.Queue.Complete(ctx, job.ID, r.WorkerID)
	}
	backoff := time.Second << min(job.Attempts-1, 8)
	return r.Queue.Fail(ctx, job, err.Error(), backoff)
}

func (r *Runner) Run(ctx context.Context, poll time.Duration) error {
	ticker := time.NewTicker(poll)
	defer ticker.Stop()
	for {
		err := r.RunOnce(ctx)
		if err == nil {
			continue
		}
		if !errors.Is(err, ErrNoJob) {
			return err
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}
