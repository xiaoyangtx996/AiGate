# Plan 05 — MCP 资产治理

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 5  
Outcome: MCP 可注册/授权；调用经鉴权计量；健康检查可告警  
Depends: Plan 04

```yaml
/goal
title: Govern MCP tools as metered enterprise assets
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - internal/mcp/
    - internal/alerts/
constraints:
  - MCP is an asset with register authorize meter health version hooks
  - tool endpoints must be proxied or credential-brokered; do not expose raw internal URL to employees if private tools
  - unauthorized project/agent cannot invoke tool
  - usage attributable to caller and countable in quota/report dimensions
success_criteria:
  - admin can register MCP and grant to a project
  - unauthorized invoke blocked; authorized invoke logged with cost/token fields when available
  - health checker marks tool unhealthy after consecutive failures
  - go test ./internal/mcp/... passes
common_failure_modes:
  - treating MCP as UI catalog only without runtime enforcement
  - missing audit row on tool call
  - health check false positives without backoff
short_test:
  - shell: |
      go test ./internal/mcp/... ./internal/alerts/...
deliverables:
  - MCP registry authorization proxy metering and health APIs/tests
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
