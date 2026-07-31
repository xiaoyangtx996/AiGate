package usage

import (
	"context"
	"errors"
	"testing"
	"time"
)

type repoStub struct {
	filter Filter
	result Summary
}

func (r *repoStub) Summary(_ context.Context, filter Filter) (Summary, error) {
	r.filter = filter
	return r.result, nil
}

func TestSummaryValidatesRangeAndPreservesTenantFilter(t *testing.T) {
	repo := &repoStub{result: Summary{Daily: []Daily{{Day: "2026-07-31", Calls: 1}}}}
	service := NewService(repo)
	from := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	to := from.Add(24 * time.Hour)
	result, err := service.Summary(context.Background(), Filter{TenantID: "tenant-a", ProjectID: "project-a", From: from, To: to})
	if err != nil || len(result.Daily) != 1 || repo.filter.TenantID != "tenant-a" || repo.filter.ProjectID != "project-a" {
		t.Fatalf("result=%+v filter=%+v err=%v", result, repo.filter, err)
	}
	if _, err = service.Summary(context.Background(), Filter{TenantID: "tenant-a", From: to, To: from}); !errors.Is(err, ErrInvalidRange) {
		t.Fatalf("err=%v", err)
	}
}
