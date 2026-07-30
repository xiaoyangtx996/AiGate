DROP INDEX IF EXISTS "document_chunk_embedding_hnsw_idx";
ALTER TABLE "document_chunk" DROP COLUMN IF EXISTS "embedding";
DROP EXTENSION IF EXISTS vector;
CREATE DOMAIN public.vector AS text;
ALTER TABLE "document_chunk" ADD COLUMN IF NOT EXISTS "embedding" public.vector;
