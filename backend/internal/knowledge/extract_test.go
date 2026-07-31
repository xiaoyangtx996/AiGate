package knowledge

import (
	"testing"
)

func TestExtractPlainTextRejectsInvalidUTF8(t *testing.T) {
	_, err := extractPlainText("text/plain", []byte{0xff, 0xfe, 0xfd})
	if err == nil {
		t.Fatal("expected utf-8 error")
	}
}

func TestExtractPlainTextMarkdownPassthrough(t *testing.T) {
	raw := []byte("# hello\n")
	out, err := extractPlainText("text/markdown", raw)
	if err != nil || string(out) != string(raw) {
		t.Fatalf("out=%q err=%v", out, err)
	}
}

func TestAllowedMediaTypes(t *testing.T) {
	if !allowedMediaType("application/pdf") || mediaTypeFor("a.pdf") != "application/pdf" {
		t.Fatal("pdf media type missing")
	}
}
