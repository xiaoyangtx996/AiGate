# AiGate Backend

Go API 与数据迁移（对应仓库里的「后端」一侧）。

```bash
go build ./...
go test ./...
go run ./cmd/api
```

Migrations live in `migrations/`. Schema comments (`COMMENT ON`) are mandatory for every business table and column.
