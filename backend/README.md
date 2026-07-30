# AiGate Backend

Go API 与数据迁移（对应仓库里的「后端」一侧）。

```bash
go build ./...
go test ./...
go run ./cmd/api
go run ./cmd/gateway
```

Migrations live in `migrations/`. Schema comments (`COMMENT ON`) are mandatory for every business table and column.

`cmd/gateway` fronts a NewAPI sidecar. Configure channels, model mappings,
employee API keys and hierarchical quotas through the admin REST API documented
in the repository root README.
