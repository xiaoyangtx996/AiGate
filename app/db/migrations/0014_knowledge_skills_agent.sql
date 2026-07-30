-- Phase 4 knowledge RAG, skills and agent capability switches
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN undefined_file THEN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
      CREATE DOMAIN vector AS text;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS storage_instance (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'vector' NOT NULL,
  type text DEFAULT 'pgvector' NOT NULL,
  config jsonb DEFAULT '{}',
  is_default boolean DEFAULT false NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS storage_instance_type_idx ON storage_instance(type);
CREATE INDEX IF NOT EXISTS storage_instance_default_idx ON storage_instance(is_default);

INSERT INTO storage_instance (name, category, type, config, is_default, status)
SELECT '内置 PGVector', 'vector', 'pgvector', '{}', true, 'active'
WHERE NOT EXISTS (SELECT 1 FROM storage_instance WHERE type = 'pgvector' AND is_default = true);

ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS storage_instance_id text REFERENCES storage_instance(id) ON DELETE SET NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS embedding_model_id text REFERENCES ai_model(id) ON DELETE SET NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS embedding_dim integer DEFAULT 1536;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS rerank_model_id text REFERENCES ai_model(id) ON DELETE SET NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS chunk_size integer DEFAULT 1000 NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS chunk_overlap integer DEFAULT 200 NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS top_k integer DEFAULT 5 NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS dedup_strategy text DEFAULT 'reject' NOT NULL;

UPDATE knowledge_base
SET storage_instance_id = COALESCE(
  storage_instance_id,
  (SELECT id FROM storage_instance WHERE type = 'pgvector' AND is_default = true LIMIT 1)
)
WHERE storage_instance_id IS NULL;

ALTER TABLE document ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE document ADD COLUMN IF NOT EXISTS chunk_count integer DEFAULT 0 NOT NULL;
ALTER TABLE document ADD COLUMN IF NOT EXISTS token_count integer DEFAULT 0 NOT NULL;
ALTER TABLE document ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE document ADD COLUMN IF NOT EXISTS error_msg text;
ALTER TABLE document ALTER COLUMN status SET DEFAULT 'uploaded';

CREATE TABLE IF NOT EXISTS document_chunk (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  knowledge_base_id text NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  sort integer DEFAULT 0 NOT NULL,
  content text NOT NULL,
  token_count integer DEFAULT 0 NOT NULL,
  content_hash text,
  embedding vector,
  created_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS document_chunk_document_idx ON document_chunk(document_id);
CREATE INDEX IF NOT EXISTS document_chunk_kb_idx ON document_chunk(knowledge_base_id);
CREATE INDEX IF NOT EXISTS document_chunk_hash_idx ON document_chunk(content_hash);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    CREATE INDEX IF NOT EXISTS document_chunk_embedding_hnsw_idx ON document_chunk USING hnsw (embedding vector_cosine_ops);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS skill (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text REFERENCES organization(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  content text NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  has_files boolean DEFAULT false NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS skill_org_idx ON skill(organization_id);
CREATE INDEX IF NOT EXISTS skill_enabled_idx ON skill(enabled);

CREATE TABLE IF NOT EXISTS skill_file (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id text NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS skill_file_skill_idx ON skill_file(skill_id);
CREATE INDEX IF NOT EXISTS skill_file_path_idx ON skill_file(skill_id, path);

ALTER TABLE agent ADD COLUMN IF NOT EXISTS memory_enabled boolean DEFAULT true NOT NULL;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS mcp_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS skill_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS rag_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS rag_call_mode text DEFAULT 'auto' NOT NULL;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS short_term_memory_size integer DEFAULT 10 NOT NULL;

CREATE TABLE IF NOT EXISTS agent_knowledge_base (
  agent_id text NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  knowledge_base_id text NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY (agent_id, knowledge_base_id)
);
CREATE INDEX IF NOT EXISTS agent_kb_agent_idx ON agent_knowledge_base(agent_id);
CREATE INDEX IF NOT EXISTS agent_kb_kb_idx ON agent_knowledge_base(knowledge_base_id);

CREATE TABLE IF NOT EXISTS agent_mcp_tool (
  agent_id text NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  tool_id text NOT NULL REFERENCES mcp_tool(id) ON DELETE CASCADE,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY (agent_id, tool_id)
);
CREATE INDEX IF NOT EXISTS agent_mcp_agent_idx ON agent_mcp_tool(agent_id);
CREATE INDEX IF NOT EXISTS agent_mcp_tool_idx ON agent_mcp_tool(tool_id);

CREATE TABLE IF NOT EXISTS agent_skill (
  agent_id text NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  skill_id text NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY (agent_id, skill_id)
);
CREATE INDEX IF NOT EXISTS agent_skill_agent_idx ON agent_skill(agent_id);
CREATE INDEX IF NOT EXISTS agent_skill_skill_idx ON agent_skill(skill_id);
