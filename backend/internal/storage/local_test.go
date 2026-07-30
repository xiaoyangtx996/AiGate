package storage

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"
)

func TestLocalRoundTripAndLimit(t *testing.T) {
	s := Local{Root: t.TempDir(), MaxBytes: 5}
	if _, err := s.Put(context.Background(), "a/b.md", strings.NewReader("hello")); err != nil {
		t.Fatal(err)
	}
	r, err := s.Open(context.Background(), "a/b.md")
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	b, _ := io.ReadAll(r)
	if string(b) != "hello" {
		t.Fatalf("got %q", b)
	}
	if _, err := s.Put(context.Background(), "large", strings.NewReader("123456")); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("got %v", err)
	}
}

func TestLocalRejectsTraversal(t *testing.T) {
	s := Local{Root: t.TempDir()}
	if _, err := s.Put(context.Background(), "../outside", strings.NewReader("x")); err == nil {
		t.Fatal("expected traversal to be rejected")
	}
}
