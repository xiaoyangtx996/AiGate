CREATE UNIQUE INDEX IF NOT EXISTS "model_combo_org_name_unique_idx"
ON "model_combo" ("organization_id", "name");
