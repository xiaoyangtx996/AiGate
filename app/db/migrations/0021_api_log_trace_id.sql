ALTER TABLE "api_log" ADD COLUMN IF NOT EXISTS "trace_id" text;
CREATE INDEX IF NOT EXISTS "api_log_trace_id_idx" ON "api_log" ("trace_id");
