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
psql "postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable" -v ON_ERROR_STOP=1 -f migrations/000003_gateway_quota.up.sql
```

Bootstrap and login (JWT secret ≥ 32 bytes):

```bash
cd backend
export AIGATE_JWT_SECRET=replace-with-at-least-32-bytes-secret
export AIGATE_CHANNEL_ENCRYPTION_KEY=$(openssl rand -base64 32)
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

## Gateway / NewAPI sidecar

AiGate owns employee keys, quota precheck and `api_logs`; NewAPI remains a
sibling OpenAI-compatible upstream. With an admin JWT, configure its base URL
and the public-to-upstream model mapping:

```text
POST /v1/channels
{"name":"newapi","base_url":"http://localhost:3000","credential":"UPSTREAM_TOKEN"}

PUT /v1/model-prices/gpt-4o-mini
{"upstream_model":"gpt-4o-mini","input_micros_per_million":150000,"output_micros_per_million":600000}
```

Configure tenant, organization and user token limits through
`PUT /v1/quotas/{tenant|organization|user}/{id}` (**all three required**
before the gateway will accept traffic; missing any returns HTTP 429
`quota_not_configured`), then issue an employee key with `POST /v1/api-keys`.
The secret is returned once.

```bash
cd backend
export TRUSTED_PROXY_CIDRS=127.0.0.1/32
go run ./cmd/gateway

curl http://localhost:8081/v1/chat/completions \
  -H "Authorization: Bearer EMPLOYEE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}'
```

`AIGATE_GATEWAY_ADDR` defaults to `:8081`. `X-Forwarded-For` is used only when
the direct peer belongs to `TRUSTED_PROXY_CIDRS`. The API and gateway processes
must receive the same `AIGATE_CHANNEL_ENCRYPTION_KEY` value.

## Frontend

See [`frontend/README.md`](frontend/README.md). SPA scaffold lands in Plan 07a; until then this directory is a reserved placeholder.

## API docs

中文接口文档与 Reqable 集合维护在 [`docs/接口文档/`](docs/接口文档/)。
