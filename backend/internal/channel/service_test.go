package channel

import (
	"context"
	"errors"
	"testing"

	"github.com/xiaoyangtx996/AiGate/internal/billing"
)

type memoryRepo struct {
	items map[string]Config
}

func newMemoryRepo() *memoryRepo {
	return &memoryRepo{items: map[string]Config{}}
}

func (m *memoryRepo) Create(_ context.Context, c Config) error {
	m.items[c.ID] = c
	return nil
}

func (m *memoryRepo) List(_ context.Context, tenantID string) ([]Config, error) {
	var out []Config
	for _, c := range m.items {
		if c.TenantID == tenantID {
			out = append(out, Config{ID: c.ID, TenantID: c.TenantID, Name: c.Name, BaseURL: c.BaseURL, Active: c.Active})
		}
	}
	return out, nil
}

func (m *memoryRepo) Get(_ context.Context, tenantID, id string) (Config, error) {
	c, ok := m.items[id]
	if !ok || c.TenantID != tenantID {
		return Config{}, ErrNotFound
	}
	return c, nil
}

func (m *memoryRepo) Update(_ context.Context, c Config) error {
	if _, ok := m.items[c.ID]; !ok {
		return ErrNotFound
	}
	m.items[c.ID] = c
	return nil
}

func (m *memoryRepo) DeactivateOthers(_ context.Context, tenantID, keepID string) error {
	for id, c := range m.items {
		if c.TenantID == tenantID && c.Active && id != keepID {
			c.Active = false
			m.items[id] = c
		}
	}
	return nil
}

func (m *memoryRepo) SetPrice(context.Context, string, string, string, int64, int64) error {
	return nil
}

func (m *memoryRepo) Resolve(context.Context, string, string) (Config, string, *billing.Price, error) {
	return Config{}, "", nil, ErrNoRoute
}

func TestCreateDeactivatesSibling(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i + 1)
	}
	cipher, err := NewCipher(key)
	if err != nil {
		t.Fatal(err)
	}
	repo := newMemoryRepo()
	svc := NewService(repo, cipher)
	first, err := svc.Create(context.Background(), "t1", "a", "https://a.example/v1", "secret-a")
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Create(context.Background(), "t1", "b", "https://b.example/v1", "secret-b")
	if err != nil {
		t.Fatal(err)
	}
	got, _ := repo.Get(context.Background(), "t1", first.ID)
	if got.Active {
		t.Fatal("first channel should be deactivated")
	}
	got, _ = repo.Get(context.Background(), "t1", second.ID)
	if !got.Active {
		t.Fatal("second channel should be active")
	}
	active := true
	_, err = svc.Update(context.Background(), "t1", first.ID, UpdateInput{Active: &active})
	if err != nil {
		t.Fatal(err)
	}
	got, _ = repo.Get(context.Background(), "t1", second.ID)
	if got.Active {
		t.Fatal("second should deactivate when first reactivated")
	}
	list, err := svc.List(context.Background(), "t1")
	if err != nil || len(list) != 2 {
		t.Fatalf("list=%v err=%v", list, err)
	}
	_, err = svc.Update(context.Background(), "t1", "missing", UpdateInput{})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound got %v", err)
	}
}
