# Plan 05 — MCP 资产治理

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 5  
Outcome: MCP 可注册/授权；调用经鉴权计量；健康检查可告警；调用入审计  
Depends: Plan 03（建议 03b）；**不依赖 Plan 04**，可与 04 并行

```yaml
/goal
title: Govern MCP tools as metered enterprise assets
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - internal/mcp/
constraints:
  - MCP is an asset with register authorize meter health version hooks
  - support two catalogs: enterprise private registry (MVP must) and curated public marketplace entries (MVP can be seed/read-only list)
  - tool endpoints must be proxied or credential-brokered; do not expose raw private URLs to employees
  - unauthorized project/agent cannot invoke tool
  - usage attributable to caller and written to audit_event when 03b present
  - health checks run as jobs via cmd/worker
  - do not wait for knowledge base milestone
success_criteria:
  - admin can register private MCP and grant to a project
  - public marketplace list is readable and an entry can be enabled/installed into tenant catalog
  - unauthorized invoke blocked; authorized invoke logged with cost/token fields when available
  - health checker marks tool unhealthy after consecutive failures and can raise alert
  - go test ./internal/mcp/... passes
common_failure_modes:
  - treating MCP as UI catalog only without runtime enforcement
  - missing audit row on tool call
  - hard dependency on RAG packages
  - conflating public marketplace install with unrestricted global access
short_test:
  - shell: |
      go test ./internal/mcp/...
deliverables:
  - MCP private registry plus public catalog APIs with authorization proxy metering health tests
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
