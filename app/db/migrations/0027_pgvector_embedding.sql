-- Replace text-domain vector fallback with real pgvector extension (requires extension binaries).
DROP INDEX IF EXISTS "document_chunk_embedding_hnsw_idx";
ALTER TABLE "document_chunk" DROP COLUMN IF EXISTS "embedding";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'vector' AND t.typtype = 'd' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP DOMAIN public.vector CASCADE';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "document_chunk" ADD COLUMN IF NOT EXISTS "embedding" vector;
