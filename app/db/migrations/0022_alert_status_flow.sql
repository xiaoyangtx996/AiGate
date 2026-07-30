DO $$ BEGIN
  CREATE TYPE "alert_status" AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "alert" ADD COLUMN IF NOT EXISTS "status" "alert_status" DEFAULT 'open' NOT NULL;

UPDATE "alert"
SET "status" = CASE WHEN "read" THEN 'acknowledged'::"alert_status" ELSE 'open'::"alert_status" END
WHERE "status" IS NULL OR "status" = 'open';

CREATE INDEX IF NOT EXISTS "idx_alert_org_status_created" ON "alert" ("organization_id", "status", "created_at");
