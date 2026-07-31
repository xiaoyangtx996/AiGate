BEGIN;

ALTER TABLE knowledge_documents
    DROP CONSTRAINT IF EXISTS knowledge_documents_media_type_check;
ALTER TABLE knowledge_documents
    ADD CONSTRAINT knowledge_documents_media_type_check
    CHECK (media_type IN ('text/markdown', 'text/plain', 'application/pdf'));
COMMENT ON COLUMN knowledge_documents.media_type IS '允许处理的内容类型：Markdown、纯文本或 PDF（PDF 在 worker 中抽取纯文本后再切片）';

COMMIT;
