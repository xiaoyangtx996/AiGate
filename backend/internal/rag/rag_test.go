package rag

import (
	"context"
	"errors"
	"testing"
)

type accessStub bool

func (a accessStub) HasProjectAccess(context.Context, string, string, string) (bool, error) {
	return bool(a), nil
}

type repoStub struct{ called bool }

func (r *repoStub) Search(context.Context, string, string, string, []float32, int) ([]Result, error) {
	r.called = true
	return []Result{{Citation: Citation{DocumentID: "doc", SpanStart: 1, SpanEnd: 4}}}, nil
}

func TestSearchDeniesCrossProject(t *testing.T) {
	repo := &repoStub{}
	_, err := NewService(accessStub(false), repo, HashEmbedder{}).Search(context.Background(), "t", "other-project", "kb", "u", "secret", 5)
	if !errors.Is(err, ErrForbidden) || repo.called {
		t.Fatalf("err=%v called=%v", err, repo.called)
	}
}

func TestSearchReturnsCitation(t *testing.T) {
	results, err := NewService(accessStub(true), &repoStub{}, HashEmbedder{}).Search(context.Background(), "t", "p", "kb", "u", "hello", 5)
	if err != nil || len(results) != 1 || results[0].Citation.DocumentID != "doc" {
		t.Fatalf("results=%+v err=%v", results, err)
	}
}
