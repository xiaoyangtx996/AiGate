DO $$ BEGIN
  CREATE TYPE "system_setting_scope" AS ENUM ('global', 'org');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'key_expired';
ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'mcp_unavailable';
ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'knowledge_storage';
ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'agent_error';
ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'channel_down';
ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'credential_exhausted';
ALTER TYPE "alert_type" ADD VALUE IF NOT EXISTS 'cost_spike';

CREATE TABLE IF NOT EXISTS "system_setting" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope" "system_setting_scope" DEFAULT 'global' NOT NULL,
  "organization_id" text,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "updated_by" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "system_setting_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "system_setting_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "user"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_setting_scope_org_key_idx" ON "system_setting" ("scope", "organization_id", "key");
CREATE INDEX IF NOT EXISTS "system_setting_key_idx" ON "system_setting" ("key");

CREATE TABLE IF NOT EXISTS "user_notification_pref" (
  "user_id" text NOT NULL,
  "alert_type" text NOT NULL,
  "channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_notification_pref_pk" PRIMARY KEY ("user_id", "alert_type"),
  CONSTRAINT "user_notification_pref_user_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "user_notification_pref_user_idx" ON "user_notification_pref" ("user_id");
