# AiGate

AiGate is an enterprise AI control plane being rebuilt as an All-in Go backend.
The current scaffold defines Tenant, Organization (department), and Project as
independent domain entities. A Project is an asset container, not another level
in the tenant -> department -> employee organization hierarchy.

## Run locally

Local Postgres (database name `AiGate`):

```bash
# Windows: ensure psql is on PATH (PostgreSQL 14.15 bin), then:
psql "postgresql://postgres:password@localhost:5432/AiGate?sslmode=disable" -v ON_ERROR_STOP=1 -f migrations/000001_tenant_organization_project.up.sql
```

If `psql` is missing, use:
`D:\develop\Infra\PostgreSQL\14.15\bin\psql.exe` with the same connection string.

Start the API stub (defaults to `:8080`):

```bash
go run ./cmd/api
curl http://localhost:8080/healthz
```

Set `AIGATE_HTTP_ADDR` to override the listen address.

## Frontend

The frontend will be a separately built Vue 3 SPA under `web/`, with its own
`package.json`. It consumes the Go HTTP API and is not coupled to Go templates,
Nuxt, or SSR. No frontend is implemented in this milestone.
