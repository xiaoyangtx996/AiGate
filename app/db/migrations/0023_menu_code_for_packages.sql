ALTER TABLE "menu" ADD COLUMN IF NOT EXISTS "code" text;
UPDATE "menu" SET "code" = "id" WHERE "code" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "menu_code_unique" ON "menu" ("code") WHERE "code" IS NOT NULL;
