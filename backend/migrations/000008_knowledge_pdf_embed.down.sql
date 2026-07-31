BEGIN;

ALTER TABLE knowledge_documents
    DROP CONSTRAINT IF EXISTS knowledge_documents_media_type_check;
ALTER TABLE knowledge_documents
    ADD CONSTRAINT knowledge_documents_media_type_check
    CHECK (media_type IN ('text/markdown', 'text/plain'));
COMMENT ON COLUMN knowledge_documents.media_type IS '允许处理的内容类型；MVP 支持 Markdown 和纯文本';

COMMIT;
