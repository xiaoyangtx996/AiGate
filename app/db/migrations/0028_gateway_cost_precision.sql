ALTER TABLE "organization"
  ADD COLUMN IF NOT EXISTS "cost_used" numeric(18, 8) DEFAULT 0 NOT NULL;

ALTER TABLE "ai_model"
  ALTER COLUMN "input_price" TYPE numeric(18, 8) USING "input_price"::numeric(18, 8),
  ALTER COLUMN "input_price" SET DEFAULT 0,
  ALTER COLUMN "output_price" TYPE numeric(18, 8) USING "output_price"::numeric(18, 8),
  ALTER COLUMN "output_price" SET DEFAULT 0;

ALTER TABLE "api_key"
  ALTER COLUMN "cost" TYPE numeric(18, 8) USING "cost"::numeric(18, 8),
  ALTER COLUMN "cost" SET DEFAULT 0;

ALTER TABLE "api_log"
  ALTER COLUMN "cost" TYPE numeric(18, 8) USING "cost"::numeric(18, 8),
  ALTER COLUMN "cost" SET DEFAULT 0;

ALTER TABLE "billing_record"
  ALTER COLUMN "cost" TYPE numeric(18, 8) USING "cost"::numeric(18, 8),
  ALTER COLUMN "cost" SET DEFAULT 0;
