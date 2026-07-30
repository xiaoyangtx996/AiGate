-- Drop legacy channel api_key after credentials have been migrated.
ALTER TABLE channel DROP COLUMN IF EXISTS api_key;
