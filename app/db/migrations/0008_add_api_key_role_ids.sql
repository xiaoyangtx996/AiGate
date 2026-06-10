-- Add roleIds to api_key table
-- Generated: 2026-06-04

-- Add role_ids column to api_key table
ALTER TABLE api_key ADD COLUMN IF NOT EXISTS role_ids JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN api_key.role_ids IS 'bound role IDs for API key permission control';
