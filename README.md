# AiGate

AiGate is an All-in Go enterprise AI control plane with a separate Vue SPA.

```text
AiGate/
  backend/     # Go API（cmd / internal / migrations）
  frontend/    # Vue3 SPA（独立 package.json，仅 HTTP 调后端）
  .claude/     # PRD 与 milestone plans
```

前后端分离：后端只提供 REST/SSE；前端独立构建部署，不耦合 Go template / Nuxt / SSR。

## Backend

```bash
cd backend
psql "postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable" -v ON_ERROR_STOP=1 -f migrations/000001_tenant_organization_project.up.sql
psql "postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable" -v ON_ERROR_STOP=1 -f migrations/000002_tenant_rbac.up.sql
```

Bootstrap and login (JWT secret ≥ 32 bytes):

```bash
cd backend
export AIGATE_JWT_SECRET=replace-with-at-least-32-bytes-secret
export AIGATE_BOOTSTRAP_TENANT_ID=TENANT_UUID
export AIGATE_BOOTSTRAP_ORGANIZATION_ID=ORGANIZATION_UUID
export AIGATE_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
export AIGATE_BOOTSTRAP_ADMIN_PASSWORD=change-me
go run ./cmd/api
```

```bash
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"TENANT_UUID","email":"admin@example.com","password":"change-me"}'
```

Default DB URL: `postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable`  
Override with `AIGATE_DATABASE_URL`. Listen address: `AIGATE_HTTP_ADDR` (default `:8080`).

Create a tenant and first department before bootstrap:

```sql
INSERT INTO tenants (id, name) VALUES ('TENANT_UUID', 'Local tenant');
INSERT INTO organizations (id, tenant_id, name)
VALUES ('ORGANIZATION_UUID', 'TENANT_UUID', 'IT');
```

Tenant insert auto-creates `platform_admin` and `project_member` roles.

## Frontend

See [`frontend/README.md`](frontend/README.md). SPA scaffold lands in Plan 07a; until then this directory is a reserved placeholder.
