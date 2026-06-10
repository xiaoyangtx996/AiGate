CREATE TABLE IF NOT EXISTS quota_request (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  requester_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  requested_token_limit integer NOT NULL,
  current_token_limit integer DEFAULT 0 NOT NULL,
  reason text,
  status text DEFAULT 'pending' NOT NULL,
  approver_id text REFERENCES "user"(id),
  decision_comment text,
  decided_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS quota_request_org_status_idx ON quota_request(organization_id, status);
CREATE INDEX IF NOT EXISTS quota_request_requester_idx ON quota_request(requester_id);
CREATE INDEX IF NOT EXISTS quota_request_created_idx ON quota_request(created_at);

CREATE TABLE IF NOT EXISTS quota_change_log (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  request_id text REFERENCES quota_request(id) ON DELETE SET NULL,
  actor_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  previous_token_limit integer NOT NULL,
  next_token_limit integer NOT NULL,
  decision_status text,
  reason text,
  created_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE quota_change_log ADD COLUMN IF NOT EXISTS decision_status text;

CREATE INDEX IF NOT EXISTS quota_change_log_org_created_idx ON quota_change_log(organization_id, created_at);
CREATE INDEX IF NOT EXISTS quota_change_log_request_idx ON quota_change_log(request_id);
