# Plan 03 — LLM 网关与密钥配额

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 3  
Outcome: 员工 Key 走 OpenAI 兼容入口；配额不足拦截；调用有日志；真实成本字段  
Depends: Plan 02  
Decision: NewAPI sidecar；AiGate 预检 Key/配额并写日志

```yaml
/goal
title: Ship OpenAI-compatible gateway with API keys and quota enforcement
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  gateway_strategy: newapi-sidecar-with-aigate-precheck
  target_paths:
    - internal/gateway/
    - internal/apikey/
    - internal/quota/
    - internal/billing/
    - internal/channel/
    - cmd/gateway/
    - cmd/api/
constraints:
  - must not use sub2api as base
  - NewAPI runs as sidecar or sibling process; AiGate owns employee keys quota precheck and api_log
  - API keys bind to user + tenant/org and optional IP allowlist
  - only trust x-forwarded-for when remote addr is in TRUSTED_PROXY_CIDRS
  - quota conservation parent>=sum(children) for tenant-dept-employee hierarchy
  - encrypt upstream provider credentials at rest
  - compute cost from model input/output unit prices when available; never hardcode zero when prices exist
success_criteria:
  - Bearer employee key can complete a chat completions proxy call in test/env
  - exhausted quota returns explicit blocked error and writes api_log or audit row
  - api_log stores model tokens cost estimated flag and trace id
  - channel credential round-trip encrypt decrypt works in unit tests
  - go test ./internal/gateway/... ./internal/apikey/... ./internal/quota/... ./internal/channel/... passes
common_failure_modes:
  - trusting x-forwarded-for without trusted proxy CIDRs
  - cost hardcoded to zero
  - in-process rate limit broken under multi-instance without shared store note
short_test:
  - shell: |
      go test ./internal/gateway/... ./internal/apikey/... ./internal/quota/... ./internal/channel/...
deliverables:
  - Gateway precheck packages channel credentials quota and call logging
  - Integration notes for NewAPI sidecar base URL and model mapping
needs_auth:
  - Upstream LLM provider API key — required for live smoke against real model
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
