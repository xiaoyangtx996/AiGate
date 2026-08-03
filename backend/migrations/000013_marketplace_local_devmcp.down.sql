BEGIN;

UPDATE mcp_marketplace_entries
SET
    description = '官方协议能力验证服务，安装后仍需项目授权',
    endpoint_template = 'https://example.invalid/mcp/everything'
WHERE id = 'public-everything';

COMMIT;
