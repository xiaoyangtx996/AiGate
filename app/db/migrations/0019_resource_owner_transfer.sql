ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "owner_id" text REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "knowledge_base" ADD COLUMN IF NOT EXISTS "owner_id" text REFERENCES "user"("id") ON DELETE set null;

CREATE INDEX IF NOT EXISTS "agent_owner_idx" ON "agent" ("owner_id");
CREATE INDEX IF NOT EXISTS "kb_owner_idx" ON "knowledge_base" ("owner_id");
