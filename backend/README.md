# AiGate Backend

Go API 与数据迁移（对应仓库里的「后端」一侧）。

```bash
go build ./...
go test ./...
go run ./cmd/api
go run ./cmd/gateway
go run ./cmd/worker
```

Migrations live in `migrations/`. Schema comments (`COMMENT ON`) are mandatory for every business table and column.

`000005_multitenant_session` separates headquarters platform operators from
tenant users. Tenant context is inferred at login; only platform operators can
switch to another tenant and receive a newly signed tenant-scoped JWT.

`cmd/gateway` fronts a NewAPI sidecar. Configure channels, model mappings,
employee API keys and hierarchical quotas through the admin REST API documented
in the repository root README.

`cmd/worker` processes PostgreSQL-backed jobs. Plan 03b registers quota alert
webhook delivery with retries and dead-letter status; no Redis service is
required.

`cmd/api` and `cmd/gateway` accept comma-separated browser origins through
`AIGATE_CORS_ALLOWED_ORIGINS`. The local default permits Vite on ports at
`localhost:5173` and `127.0.0.1:5173`.

## Project knowledge RAG

Apply `migrations/000007_project_knowledge.up.sql`, then configure the same
local object directory for the API and worker:

```bash
export AIGATE_OBJECT_STORAGE_PATH=./data/objects
export AIGATE_OBJECT_MAX_BYTES=20971520
go run ./cmd/api
# Run separately with the same environment:
go run ./cmd/worker
```

Authenticated project members can create a KB at
`POST /v1/projects/{projectID}/knowledge-bases`, upload Markdown at
`POST /v1/projects/{projectID}/knowledge-bases/{kbID}/documents?filename=guide.md`,
poll `GET /v1/projects/{projectID}/documents/{documentID}`, and search with
`POST /v1/projects/{projectID}/knowledge-bases/{kbID}/search`. Search results
include citation `document_id`, `span_start`, and `span_end`. Failed documents
can be requeued with `POST /v1/projects/{projectID}/documents/{documentID}/retry`.

Plan 04 uses a deterministic local 384-dimensional embedder for reproducible
smoke tests. `rag.Embedder` remains the boundary for a later provider-backed
embedding model. Vector retrieval always filters tenant, project, and KB before
ranking.
