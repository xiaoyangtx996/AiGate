ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "target_type" text;
ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "target_id" text;
ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "before" jsonb;
ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "after" jsonb;

CREATE INDEX IF NOT EXISTS "logs_target_idx" ON "logs" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "logs_action_idx" ON "logs" ("action");
