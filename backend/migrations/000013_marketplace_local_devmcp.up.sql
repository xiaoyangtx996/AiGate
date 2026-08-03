BEGIN;

UPDATE mcp_marketplace_entries
SET
    description = '本地联调占位 MCP：先运行 go run ./cmd/devmcp（127.0.0.1:18100），再安装；安装后仍需项目授权。未启动时健康检查为 unhealthy。',
    endpoint_template = 'http://127.0.0.1:18100'
WHERE id = 'public-everything';

COMMIT;
