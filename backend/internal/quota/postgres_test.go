package quota

import (
	"context"
	"errors"
	"testing"
)

type memoryRepo struct {
	limits map[string]int64
	used   int64
}

type recordingEvaluator struct{ tenantID string }

func (e *recordingEvaluator) Evaluate(_ context.Context, tenantID string) error {
	e.tenantID = tenantID
	return nil
}

func (m *memoryRepo) SetLimit(_ context.Context, a Account) error {
	m.limits[string(a.Scope)+a.ScopeID] = a.LimitTokens
	return nil
}
func (m *memoryRepo) Reserve(_ context.Context, t, o, u string, n int64) (Reservation, error) {
	if _, ok := m.limits["tenant"+t]; !ok {
		return Reservation{}, ErrNotConfigured
	}
	if _, ok := m.limits["organization"+o]; !ok {
		return Reservation{}, ErrNotConfigured
	}
	if _, ok := m.limits["user"+u]; !ok {
		return Reservation{}, ErrNotConfigured
	}
	if m.used+n > m.limits["tenant"+t] {
		return Reservation{}, ErrExhausted
	}
	m.used += n
	return Reservation{ID: "r", TenantID: t, OrganizationID: o, UserID: u, Tokens: n}, nil
}
func (m *memoryRepo) Settle(_ context.Context, r Reservation, n int64) error {
	charge := chargeAgainstLimit(n, m.limits["tenant"+r.TenantID], m.used-r.Tokens, r.Tokens, r.Tokens)
	m.used = m.used - r.Tokens + charge
	return nil
}
func (m *memoryRepo) Cancel(_ context.Context, r Reservation) error { m.used -= r.Tokens; return nil }

func TestExhaustedQuota(t *testing.T) {
	r := &memoryRepo{limits: map[string]int64{"tenantt": 10, "organizationo": 10, "useru": 10}}
	s := NewService(r)
	if _, err := s.Reserve(context.Background(), "t", "o", "u", 11); !errors.Is(err, ErrExhausted) {
		t.Fatalf("err=%v", err)
	}
}

func TestReserveRequiresConfiguredQuotas(t *testing.T) {
	r := &memoryRepo{limits: map[string]int64{"tenantt": 10}}
	s := NewService(r)
	if _, err := s.Reserve(context.Background(), "t", "o", "u", 1); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("err=%v", err)
	}
}

func TestChargeAgainstLimit(t *testing.T) {
	cases := []struct {
		name                                   string
		actual, limit, used, reserved, release int64
		want                                   int64
	}{
		{name: "within headroom", actual: 5, limit: 100, used: 90, reserved: 10, release: 10, want: 5},
		{name: "caps at freed reservation near limit", actual: 15, limit: 100, used: 90, reserved: 10, release: 10, want: 10},
		{name: "never exceeds when already at limit", actual: 50, limit: 100, used: 100, reserved: 0, release: 0, want: 0},
		{name: "negative actual", actual: -3, limit: 100, used: 0, reserved: 5, release: 5, want: 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := chargeAgainstLimit(tc.actual, tc.limit, tc.used, tc.reserved, tc.release)
			if got != tc.want {
				t.Fatalf("got=%d want=%d", got, tc.want)
			}
		})
	}
}

func TestSettleCapsOverEstimate(t *testing.T) {
	r := &memoryRepo{limits: map[string]int64{"tenantt": 30, "organizationo": 30, "useru": 30}}
	s := NewService(r)
	res, err := s.Reserve(context.Background(), "t", "o", "u", 20)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.Settle(context.Background(), res, 50); err != nil {
		t.Fatal(err)
	}
	if r.used > 30 {
		t.Fatalf("used=%d exceeded limit", r.used)
	}
}

func TestSettleEvaluatesTenantAlerts(t *testing.T) {
	r := &memoryRepo{limits: map[string]int64{"tenantt": 30, "organizationo": 30, "useru": 30}}
	evaluator := &recordingEvaluator{}
	s := NewService(r, evaluator)
	reservation, err := s.Reserve(context.Background(), "t", "o", "u", 10)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.Settle(context.Background(), reservation, 10); err != nil {
		t.Fatal(err)
	}
	if evaluator.tenantID != "t" {
		t.Fatalf("evaluated tenant=%q", evaluator.tenantID)
	}
}

type failingEvaluator struct{}

func (failingEvaluator) Evaluate(context.Context, string) error {
	return errors.New("alert boom")
}

func TestSettleIgnoresEvaluatorFailure(t *testing.T) {
	r := &memoryRepo{limits: map[string]int64{"tenantt": 30, "organizationo": 30, "useru": 30}}
	s := NewService(r, failingEvaluator{})
	reservation, err := s.Reserve(context.Background(), "t", "o", "u", 10)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.Settle(context.Background(), reservation, 10); err != nil {
		t.Fatalf("settle should succeed despite evaluator error: %v", err)
	}
}
