-- Phase 2 gateway channel credentials and combo fallback
DO $$ BEGIN
  CREATE TYPE channel_credential_status AS ENUM ('active', 'disabled', 'exhausted', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE channel ADD COLUMN IF NOT EXISTS icon text;

CREATE TABLE IF NOT EXISTS channel_credential (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  name text NOT NULL,
  api_key text NOT NULL,
  status channel_credential_status DEFAULT 'active' NOT NULL,
  cooldown_until timestamp,
  last_checked_at timestamp,
  last_error text,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS channel_credential_channel_idx ON channel_credential(channel_id);
CREATE INDEX IF NOT EXISTS channel_credential_status_idx ON channel_credential(status);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'channel'
      AND column_name = 'api_key'
  ) THEN
    EXECUTE $sql$
      INSERT INTO channel_credential (channel_id, name, api_key, status, sort)
      SELECT id, '主凭证', api_key, 'active', 0
      FROM channel
      WHERE api_key IS NOT NULL
        AND api_key <> ''
        AND NOT EXISTS (
          SELECT 1 FROM channel_credential c WHERE c.channel_id = channel.id
        )
    $sql$;
  END IF;
END $$;

ALTER TABLE ai_model ADD COLUMN IF NOT EXISTS source_channel_id text REFERENCES channel(id) ON DELETE SET NULL;
ALTER TABLE ai_model ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true NOT NULL;

CREATE TABLE IF NOT EXISTS model_combo (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text REFERENCES organization(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS model_combo_org_idx ON model_combo(organization_id);
CREATE INDEX IF NOT EXISTS model_combo_name_idx ON model_combo(organization_id, name);

CREATE TABLE IF NOT EXISTS model_combo_item (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id text NOT NULL REFERENCES model_combo(id) ON DELETE CASCADE,
  sort integer DEFAULT 0 NOT NULL,
  channel_id text NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS model_combo_item_combo_idx ON model_combo_item(combo_id);
CREATE INDEX IF NOT EXISTS model_combo_item_channel_idx ON model_combo_item(channel_id);
