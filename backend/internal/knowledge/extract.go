package knowledge

import (
	"bytes"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/ledongthuc/pdf"
)

func extractPlainText(mediaType string, raw []byte) ([]byte, error) {
	switch mediaType {
	case "text/markdown", "text/plain":
		if !utf8.Valid(raw) {
			return nil, fmt.Errorf("document is not valid UTF-8")
		}
		return raw, nil
	case "application/pdf":
		return extractPDF(raw)
	default:
		return nil, fmt.Errorf("unsupported media type %q", mediaType)
	}
}

func extractPDF(raw []byte) ([]byte, error) {
	reader, err := pdf.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		return nil, fmt.Errorf("open pdf: %w", err)
	}
	var builder strings.Builder
	for page := 1; page <= reader.NumPage(); page++ {
		p := reader.Page(page)
		if p.V.IsNull() {
			continue
		}
		text, err := p.GetPlainText(nil)
		if err != nil {
			return nil, fmt.Errorf("pdf page %d: %w", page, err)
		}
		text = strings.TrimSpace(text)
		if text == "" {
			continue
		}
		if builder.Len() > 0 {
			builder.WriteByte('\n')
		}
		builder.WriteString(text)
	}
	out := strings.TrimSpace(builder.String())
	if out == "" {
		return nil, fmt.Errorf("pdf contained no extractable text")
	}
	return []byte(out), nil
}
