package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/xiaoyangtx996/AiGate/internal/db"
	"github.com/xiaoyangtx996/AiGate/internal/domain"
)

type Postgres struct{ db *db.Store }

func NewPostgres(store *db.Store) *Postgres { return &Postgres{db: store} }

func (p *Postgres) Enqueue(ctx context.Context, job Job) error {
	if job.ID == "" {
		var err error
		job.ID, err = domain.NewID()
		if err != nil {
			return err
		}
	}
	if len(job.Payload) == 0 {
		job.Payload = json.RawMessage(`{}`)
	}
	if job.MaxAttempts <= 0 {
		job.MaxAttempts = 5
	}
	var tenant any
	if job.TenantID != "" {
		tenant = job.TenantID
	}
	_, err := p.db.Pool().Exec(ctx, `INSERT INTO jobs(id,tenant_id,job_type,payload,max_attempts,available_at) VALUES($1,$2,$3,$4,$5,COALESCE($6,now()))`, job.ID, tenant, job.Type, job.Payload, job.MaxAttempts, nullableTime(job.AvailableAt))
	return err
}

func (p *Postgres) Claim(ctx context.Context, workerID string, lease time.Duration, jobTypes []string) (Job, error) {
	if len(jobTypes) == 0 {
		return Job{}, ErrNoJob
	}
	tx, err := p.db.Pool().Begin(ctx)
	if err != nil {
		return Job{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	row := tx.QueryRow(ctx, `WITH candidate AS (
		SELECT id FROM jobs WHERE job_type=ANY($3) AND ((status='pending' AND available_at <= now()) OR (status='running' AND locked_until <= now())) ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1
	) UPDATE jobs j SET status='running',attempts=j.attempts+1,locked_by=$1,locked_until=now()+$2::interval,updated_at=now() FROM candidate WHERE j.id=candidate.id
	RETURNING j.id,COALESCE(j.tenant_id::text,''),j.job_type,j.payload,j.status,j.attempts,j.max_attempts,j.available_at,COALESCE(j.locked_by,''),j.locked_until,j.last_error,j.created_at,j.updated_at`, workerID, lease.String(), jobTypes)
	job, err := scanJob(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Job{}, ErrNoJob
	}
	if err != nil {
		return Job{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Job{}, err
	}
	return job, nil
}

func (p *Postgres) Complete(ctx context.Context, id, workerID string) error {
	tag, err := p.db.Pool().Exec(ctx, `UPDATE jobs SET status='completed',locked_by=NULL,locked_until=NULL,updated_at=now() WHERE id=$1 AND status='running' AND locked_by=$2`, id, workerID)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNoJob
	}
	return err
}

func (p *Postgres) Fail(ctx context.Context, job Job, message string, backoff time.Duration) error {
	if len(message) > 2000 {
		message = message[:2000]
	}
	status := "pending"
	if job.Attempts >= job.MaxAttempts {
		status = "dead_letter"
	}
	tag, err := p.db.Pool().Exec(ctx, `UPDATE jobs SET status=$3,available_at=CASE WHEN $3='pending' THEN now()+$4::interval ELSE available_at END,locked_by=NULL,locked_until=NULL,last_error=$5,updated_at=now() WHERE id=$1 AND status='running' AND locked_by=$2`, job.ID, job.LockedBy, status, backoff.String(), message)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNoJob
	}
	return err
}

type rowScanner interface{ Scan(...any) error }

func scanJob(row rowScanner) (Job, error) {
	var job Job
	var payload []byte
	err := row.Scan(&job.ID, &job.TenantID, &job.Type, &payload, &job.Status, &job.Attempts, &job.MaxAttempts, &job.AvailableAt, &job.LockedBy, &job.LockedUntil, &job.LastError, &job.CreatedAt, &job.UpdatedAt)
	job.Payload = json.RawMessage(payload)
	return job, err
}
func nullableTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}
