# Plan 03b — 审计 / Job / 配额预警

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 3b  
Outcome: 统一 audit 事件；共享 worker；配额阈值告警 + webhook  
Depends: Plan 03

```yaml
/goal
title: Add unified audit events job runner and quota threshold alerts
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - backend/internal/audit/
    - backend/internal/jobs/
    - backend/internal/alerts/
    - backend/cmd/worker/
    - backend/migrations/
constraints:
  - DB-backed jobs only for MVP; no Redis queue hard dependency
  - audit_event must correlate gateway MCP and later agent calls via trace_id
  - quota alerts support configurable thresholds default 70 90 100 percent
  - at least one notifier channel webhook; email optional later
  - tenant scoped queries for audit and alerts
success_criteria:
  - gateway or quota path can append audit_event rows readable via API with tenant filter
  - audit list API supports time range filter and CSV export
  - cmd/worker processes pending jobs with retry and dead-letter or failed status
  - crossing quota threshold creates alert record and attempts webhook delivery in test
  - go test ./internal/audit/... ./internal/jobs/... ./internal/alerts/... passes
common_failure_modes:
  - logging only in api_log without queryable audit abstraction
  - alert spam without cooldown or dedupe window
  - worker and API racing on job claims without locking
short_test:
  - shell: |
      cd backend
      go test ./internal/audit/... ./internal/jobs/... ./internal/alerts/...
deliverables:
  - Audit Jobs Alerts packages with worker binary migrations and CSV export API
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
