package knowledge

import (
	"os"
	"path/filepath"
	"strings"
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

func TestExtractDemo3SamplePDF(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "testdata", "samples", "demo3-citation.pdf"))
	if err != nil {
		t.Fatal(err)
	}
	out, err := extractPlainText("application/pdf", raw)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(out), "AIGATE-PDF-0803") {
		t.Fatalf("missing citation marker: %q", out)
	}
}
