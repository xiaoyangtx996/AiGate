ALTER TABLE "api_log" ADD COLUMN IF NOT EXISTS "tokens_estimated" boolean DEFAULT false NOT NULL;
