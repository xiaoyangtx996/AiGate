package storage

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var ErrTooLarge = errors.New("object exceeds size limit")

type Local struct {
	Root     string
	MaxBytes int64
}

func (s Local) Put(_ context.Context, key string, source io.Reader) (int64, error) {
	if s.MaxBytes <= 0 {
		s.MaxBytes = 20 << 20
	}
	path, err := s.path(key)
	if err != nil {
		return 0, err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return 0, err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".upload-*")
	if err != nil {
		return 0, err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	n, copyErr := io.Copy(tmp, io.LimitReader(source, s.MaxBytes+1))
	closeErr := tmp.Close()
	if copyErr != nil {
		return 0, copyErr
	}
	if closeErr != nil {
		return 0, closeErr
	}
	if n > s.MaxBytes {
		return 0, ErrTooLarge
	}
	if err := os.Rename(tmpName, path); err != nil {
		return 0, err
	}
	return n, nil
}

func (s Local) Open(_ context.Context, key string) (io.ReadCloser, error) {
	path, err := s.path(key)
	if err != nil {
		return nil, err
	}
	return os.Open(path)
}

func (s Local) path(key string) (string, error) {
	if s.Root == "" || key == "" {
		return "", errors.New("storage root and key are required")
	}
	root, err := filepath.Abs(s.Root)
	if err != nil {
		return "", err
	}
	path, err := filepath.Abs(filepath.Join(root, filepath.FromSlash(key)))
	if err != nil {
		return "", err
	}
	rel, err := filepath.Rel(root, path)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return "", errors.New("invalid object key")
	}
	return path, nil
}
