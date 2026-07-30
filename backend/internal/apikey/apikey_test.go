package apikey

import (
	"context"
	"errors"
	"net"
	"net/http/httptest"
	"testing"
)

func TestForwardedForOnlyFromTrustedProxy(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "203.0.113.5:1234"
	r.Header.Set("X-Forwarded-For", "198.51.100.9")
	if got := ClientIP(r, []string{"10.0.0.0/8"}).String(); got != "203.0.113.5" {
		t.Fatalf("untrusted proxy produced %s", got)
	}
	r.RemoteAddr = "10.1.2.3:1234"
	if got := ClientIP(r, []string{"10.0.0.0/8"}).String(); got != "198.51.100.9" {
		t.Fatalf("trusted proxy produced %s", got)
	}
	r.Header.Set("X-Forwarded-For", "192.0.2.66, 198.51.100.9, 10.2.3.4")
	if got := ClientIP(r, []string{"10.0.0.0/8"}).String(); got != "198.51.100.9" {
		t.Fatalf("proxy chain produced %s", got)
	}
}

func TestAllowlist(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "192.0.2.10:1"
	if err := CheckIP(ClientIP(r, nil), []string{"192.0.2.0/24"}); err != nil {
		t.Fatal(err)
	}
	if err := CheckIP(ClientIP(r, nil), []string{"10.0.0.0/8"}); err == nil {
		t.Fatal("denied IP accepted")
	}
}

type memoryKeys struct {
	byHash map[string]Principal
	keys   map[string]Key
}

func (m *memoryKeys) Create(_ context.Context, key Key, hash string) error {
	m.keys[key.ID] = key
	m.byHash[hash] = Principal{KeyID: key.ID, TenantID: key.TenantID, OrganizationID: key.OrganizationID, UserID: key.UserID, AllowedCIDRs: key.AllowedCIDRs}
	return nil
}
func (m *memoryKeys) FindByHash(_ context.Context, hash string) (Principal, error) {
	p, ok := m.byHash[hash]
	if !ok {
		return Principal{}, ErrInvalidKey
	}
	return p, nil
}
func (m *memoryKeys) Touch(context.Context, string) error { return nil }
func (m *memoryKeys) List(context.Context, string) ([]Key, error) {
	return nil, nil
}
func (m *memoryKeys) Revoke(_ context.Context, tenantID, id string) error {
	k, ok := m.keys[id]
	if !ok || k.TenantID != tenantID {
		return ErrNotFound
	}
	delete(m.keys, id)
	return nil
}

func TestRevokeMissingKey(t *testing.T) {
	svc := NewService(&memoryKeys{byHash: map[string]Principal{}, keys: map[string]Key{}})
	if err := svc.Revoke(context.Background(), "t", "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("err=%v", err)
	}
}

func TestAuthenticateUsesStoredOrganization(t *testing.T) {
	repo := &memoryKeys{byHash: map[string]Principal{}, keys: map[string]Key{}}
	svc := NewService(repo)
	key, plain, err := svc.Issue(context.Background(), "t", "org-new", "u", "n", nil)
	if err != nil {
		t.Fatal(err)
	}
	// Simulate FindByHash reading live user org (postgres path); memory stores what Issue wrote.
	p, err := svc.Authenticate(context.Background(), plain, net.IPv4(127, 0, 0, 1))
	if err != nil {
		t.Fatal(err)
	}
	if p.OrganizationID != "org-new" || p.KeyID != key.ID {
		t.Fatalf("principal=%+v", p)
	}
}
