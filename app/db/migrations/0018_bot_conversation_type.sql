ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'agent' NOT NULL;

ALTER TABLE "conversation" ALTER COLUMN "agent_id" DROP NOT NULL;

UPDATE "conversation"
SET "type" = 'bot'
WHERE "agent_id" = 'aigate-bot';

UPDATE "conversation"
SET "agent_id" = NULL
WHERE "type" = 'bot' AND "agent_id" = 'aigate-bot';

CREATE INDEX IF NOT EXISTS "conv_type_user_idx" ON "conversation" ("type", "user_id");
