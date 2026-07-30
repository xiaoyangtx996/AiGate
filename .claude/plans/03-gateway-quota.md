# Plan 03 — LLM 网关与密钥配额

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 3  
Outcome: 员工 Key 走 OpenAI 兼容入口；配额不足拦截；调用有日志  
Depends: Plan 02

```yaml
/goal
title: Ship OpenAI-compatible gateway with API keys and quota enforcement
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  gateway_strategy: TBD-newapi-sidecar-or-embedded
  target_paths:
    - internal/gateway/
    - internal/apikey/
    - internal/quota/
    - internal/billing/
    - cmd/gateway/
constraints:
  - must not use sub2api as base
  - prefer NewAPI-compatible patterns or sidecar integration decided in Open Questions
  - API keys bind to user + org/tenant and optional IP allowlist hook
  - quota conservation parent>=sum(children) for configured hierarchy
  - encrypt upstream provider credentials at rest
success_criteria:
  - Bearer employee key can complete a chat completions proxy call in test/env
  - exhausted quota returns explicit blocked error and writes audit/log row
  - api_log stores model tokens cost flags and trace id fields
  - go test ./internal/gateway/... ./internal/apikey/... ./internal/quota/... passes
common_failure_modes:
  - trusting x-forwarded-for without trusted proxy CIDRs
  - cost hardcoded to zero
  - in-process rate limit broken under multi-instance
short_test:
  - shell: |
      go test ./internal/gateway/... ./internal/apikey/... ./internal/quota/...
deliverables:
  - Gateway service/package with key auth quota checks and call logging
needs_auth:
  - Upstream LLM provider API key — required for live smoke against real model
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
