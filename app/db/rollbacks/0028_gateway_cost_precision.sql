ALTER TABLE "organization" DROP COLUMN IF EXISTS "cost_used";

ALTER TABLE "ai_model"
  ALTER COLUMN "input_price" TYPE numeric(10, 6) USING "input_price"::numeric(10, 6),
  ALTER COLUMN "input_price" SET DEFAULT 0,
  ALTER COLUMN "output_price" TYPE numeric(10, 6) USING "output_price"::numeric(10, 6),
  ALTER COLUMN "output_price" SET DEFAULT 0;

ALTER TABLE "api_key"
  ALTER COLUMN "cost" TYPE numeric(10, 6) USING "cost"::numeric(10, 6),
  ALTER COLUMN "cost" SET DEFAULT 0;

ALTER TABLE "api_log"
  ALTER COLUMN "cost" TYPE numeric(10, 6) USING "cost"::numeric(10, 6),
  ALTER COLUMN "cost" SET DEFAULT 0;

ALTER TABLE "billing_record"
  ALTER COLUMN "cost" TYPE numeric(10, 6) USING "cost"::numeric(10, 6),
  ALTER COLUMN "cost" SET DEFAULT 0;
