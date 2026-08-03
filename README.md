# AiGate

AiGate is an All-in Go enterprise AI control plane with a separate Vue SPA.

```text
AiGate/
  backend/     # Go API（cmd / internal / migrations）
  frontend/    # Vue3 SPA（独立 package.json，仅 HTTP 调后端）
  .claude/     # PRD 与 milestone plans
```

前后端分离：后端只提供 REST/SSE；前端独立构建部署，不耦合 Go template / Nuxt / SSR。

当前阶段以**本地开发**为准：本机 PostgreSQL（pgvector）、`go run` 启动 api/gateway/worker、`npm run dev` 启动前端，并用浏览器验证控制台路径。容器化部署延后到开发结束后再定，仓库内不维护 Docker Compose / Dockerfile。

## Backend

```bash
cd backend
# Apply pending SQL migrations (creates schema_migrations; auto-baselines existing DBs)
go run ./cmd/migrate up
```

Optional: `go run ./cmd/migrate baseline` marks every current `*.up.sql` as applied without executing (for DBs that were migrated by hand before `schema_migrations` existed).

Bootstrap tenant administrator and login (JWT secret ≥ 32 bytes):

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
  -d '{"email":"admin@example.com","password":"change-me"}'
```

Tenant is inferred from the account. If the same email belongs to more than one
tenant, the API returns HTTP 409 with tenant names and the client asks the user
to choose; tenant IDs are no longer part of the normal login form.

To bootstrap a headquarters/platform operator that may switch tenants:

```bash
export AIGATE_PLATFORM_ADMIN_EMAIL=hq-admin@example.com
export AIGATE_PLATFORM_ADMIN_PASSWORD=change-platform-password
export AIGATE_PLATFORM_DEFAULT_TENANT_ID=TENANT_UUID
```

Platform operators are stored separately from tenant users. A tenant's
`platform_admin` role means **tenant administrator** and never grants
cross-tenant access. Only a signed platform operator session may call
`POST /v1/auth/switch-tenant`; all business queries continue to use the current
tenant in the newly issued JWT.

Default DB URL: `postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable`  
Override with `AIGATE_DATABASE_URL`. Listen address: `AIGATE_HTTP_ADDR` (default `:8080`).

Create a tenant and first department before bootstrap:

```sql
INSERT INTO tenants (id, name) VALUES ('TENANT_UUID', 'Local tenant');
INSERT INTO organizations (id, tenant_id, name)
VALUES ('ORGANIZATION_UUID', 'TENANT_UUID', 'IT');
```

Tenant insert auto-creates `platform_admin`, `project_member` and read-only
`finance_auditor` roles. Tenant menu settings may disable their menu entries,
but never expand the APIs granted by a role.

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

The current channel console manages the NewAPI sidecar address, encrypted
credential and one active channel per tenant. Advanced routing remains a
post-MVP capability.

## Audit, jobs and quota alerts

Tenant administrators can query audit events as JSON or RFC 4180 CSV. Both
audit endpoints accept `from`, `to`, `trace_id`, `event_type` and `limit`;
timestamps use RFC3339.

```text
GET /v1/audit-events
GET /v1/audit-events.csv
GET /v1/alert-policy
PUT /v1/alert-policy
GET /v1/alerts
```

Quota alert thresholds default to `70, 90, 100`. Configure the tenant policy
and optional webhook through `PUT /v1/alert-policy`, then run the PostgreSQL
worker in a separate process:

```bash
cd backend
export AIGATE_DATABASE_URL=postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable
go run ./cmd/worker
```

The worker uses row locking and leases, retries failed webhook jobs with
backoff, and moves exhausted jobs to `dead_letter`. Redis is not required.

## Demo 0 thin console

The Vue 3 console is a separate SPA under `frontend/`. Start the API, gateway
and worker, then run Vite:

```bash
cd backend
export AIGATE_CORS_ALLOWED_ORIGINS=http://localhost:5173
go run ./cmd/api

# Separate terminals, with the same database and encryption settings:
go run ./cmd/gateway
go run ./cmd/worker

cd ../frontend
cp .env.example .env
npm install
npm run dev
```

`VITE_API_BASE_URL` defaults to `http://localhost:8080` and
`VITE_GATEWAY_BASE_URL` defaults to `http://localhost:8081` in application
code. Configure both explicitly for non-local environments.

Demo 0 click path:

1. Open `http://localhost:5173` and enter email/password. The tenant is detected automatically; a tenant-name picker appears only for an email shared by multiple tenants.
2. In **组织与用户**, create/select a department and create an employee.
3. In **密钥与配额**, set tenant → department → employee quotas in that order, then issue an employee key. Copy the secret from the one-time dialog.
4. Use **网关验证** on the same page. Lower/exhaust the quota and call again to see HTTP 429 `quota_exhausted`.
5. Open **调用日志**, select a date range, verify the blocked row and use **导出 CSV**.
6. Open **告警收件箱** to view threshold records or configure the webhook policy.
7. Open **渠道凭证**, edit the NewAPI credential, save, then reopen it: the plaintext field stays empty.

## Frontend

Plan 07b Demo3 click path (API `:8080`, gateway `:8081`, worker and SPA `:5173`
must all be running locally):

1. Log in as `admin@example.com` / `change-me`. In **项目管理**, select a
   department, create a project, then grant an employee as project member.
2. Open the project's **知识库** link, create a KB, upload Markdown/text and
   optionally the sample PDF at `backend/testdata/samples/demo3-citation.pdf`.
   Keep the page open until the document changes from `queued/processing` to
   `ready`. Run a search and verify the result displays document/span citations.
3. Start the local MCP stub (`cd backend && go run ./cmd/devmcp`, listens on
   `:18100`). In **MCP 管理**, install marketplace **MCP Everything** (or
   register a private MCP pointing at `http://127.0.0.1:18100`). An installed
   asset is only in the tenant catalog; click **授权当前项目** and verify the
   health badge becomes `healthy` while `devmcp` is running, plus granted state.
   If an older marketplace install still points at an invalid host, remove it and
   reinstall after migration `000013`.
4. In **Agent**, keep the same project context, select the KB and any MCP asset
   already granted to that project, then create the Agent. Chat with an
   employee Gateway API Key and verify citations are rendered. Bound MCP assets
   are invoked during chat (`assistant_context`) so `mcp_usage_logs` and the
   usage board update; MCP failures are soft-failed into context and do not
   block the LLM answer. The key is held
   only in component memory and is cleared after a successful send. Before the
   first call, configure tenant, department and that employee's three quota
   accounts, and ensure the Agent model has a price/model mapping on the active
   channel; otherwise the gateway correctly returns `quota_not_configured` or
   `no_route`.
5. Open **Skill 管理**, create a Skill, explicitly grant it to the current
   project, then return to **Agent** and bind it. Existing Agents keep their
   pinned version when a newer version is activated. Chat writes bounded Skill
   memory and a usage event containing `skill_id`; **优化 stub** only queues a
   worker job and never edits active or pinned versions.
6. Open **用量看板**. Administrators and finance auditors default to **全部项目**;
   optionally filter by organization (which cascades the project dropdown) or one
   project. Verify the combined LLM + MCP daily calls, input/output tokens,
   split costs and quota utilization. Date inputs are UTC days: `from` is
   `00:00:00Z` and `to` is the next day's exclusive `00:00:00Z`. **导出成本汇总**
   uses the same filters. **调用日志** and its raw CSV include the attributed
   project ID/name.
7. A `project_member` session receives Projects/Knowledge/Agents menus and only
   its membership-filtered project contexts. A `finance_auditor` receives
   Usage/Logs. A user holding both roles receives the union of both menu sets;
   `tenant_menu_settings` can only remove entries. Finance remains read-only.
8. As an administrator, open **管理助手** and ask a read-only tenant usage
   question. The Bot is not exposed to finance-only sessions.

The backend remains authoritative for all project and role permissions.

See [`frontend/README.md`](frontend/README.md). The Plan 07b console is a standalone Vue 3 + Vite SPA and communicates with Go only over HTTP.

## API docs

中文接口文档与 Reqable 集合维护在 [`docs/接口文档/`](docs/接口文档/)。
