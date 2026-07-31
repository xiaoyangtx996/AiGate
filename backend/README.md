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

Apply `migrations/000007_project_knowledge.up.sql` and
`migrations/000008_knowledge_pdf_embed.up.sql`, then configure the same local
object directory for the API and worker:

```bash
export AIGATE_OBJECT_STORAGE_PATH=./data/objects
export AIGATE_OBJECT_MAX_BYTES=20971520
# Optional OpenAI-compatible embeddings (defaults to local HashEmbedder):
# export AIGATE_EMBEDDING_BASE_URL=https://api.openai.com/v1
# export AIGATE_EMBEDDING_API_KEY=sk-...
# export AIGATE_EMBEDDING_MODEL=text-embedding-3-small
# export AIGATE_EMBEDDING_DIMENSIONS=384
go run ./cmd/api
# Run separately with the same environment:
go run ./cmd/worker
```

Both `cmd/api` and `cmd/worker` must share the object storage path; otherwise
uploads stay `queued` forever.

Authenticated project members (or tenant `platform_admin`) can:

1. `POST /v1/projects/{projectID}/knowledge-bases` — create KB
2. `POST /v1/projects/{projectID}/knowledge-bases/{kbID}/documents?filename=guide.md` — upload Markdown, plain text, or PDF (`Content-Type` / extension)
3. `GET /v1/projects/{projectID}/documents/{documentID}` — poll until `ready` / `failed`
4. `POST /v1/projects/{projectID}/knowledge-bases/{kbID}/search` — retrieve chunks with nested `citation`
5. `POST /v1/projects/{projectID}/documents/{documentID}/retry` — requeue **failed** documents only

When `AIGATE_EMBEDDING_BASE_URL` is unset, Plan 04 uses a deterministic local
384-d `HashEmbedder` for reproducible smoke tests. Set the embedding env vars
on **both** API and worker to switch to a provider-backed model (vectors remain
384-d for pgvector). Retrieval always filters tenant, project, and KB before
ranking.

## Project agents and management bot

Apply `migrations/000010_project_agents.up.sql`. Agent chat calls the OpenAI-compatible
gateway only (`AIGATE_GATEWAY_BASE_URL`, default `http://127.0.0.1:8081`); the
employee gateway API key is per-request and never stored. MCP assets bound at
agent create must already have a project-level grant (`agent_id` empty).
