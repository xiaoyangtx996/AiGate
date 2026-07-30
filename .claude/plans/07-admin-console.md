# Plan 07b — 管理控制台完整 MVP

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 7b  
Outcome: 项目/KB/MCP/Agent/看板可用  
Depends: Plan 06 + Plan 07a

```yaml
/goal
title: Build full admin console MVP for projects KB MCP agents
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - web/
    - cmd/api/
constraints:
  - extend thin console from 07a; do not rewrite auth shell
  - required screens: project list membership switcher KB upload job status MCP private register public marketplace enable grant health Agent create chat usage dashboard channel providers Bot panel optional
  - role-gated nav for IT admin vs project lead vs finance/audit read-only
  - dashboards minimum: daily calls token/cost by org/project quota utilization percent
  - finance/audit can export cost rollup CSV by org/project/day
  - Chinese default UI copy
  - reuse APIs; no duplicate business logic in frontend
success_criteria:
  - operator can complete path create project upload doc create agent chat with citation
  - IT admin can manage private MCP, enable a public marketplace entry, grant to project, and see health badge and channel providers
  - project lead can manage project members
  - dashboard shows daily call count for pilot metric path
  - cost rollup CSV export available for finance/audit role
  - README documents Demo3 click path
common_failure_modes:
  - pages without project context switcher
  - UI-only permission checks
  - rebuilding all Nuxt pages at once
short_test:
  - shell: |
      go test ./...
      if (Test-Path web/package.json) { Get-Content web/package.json | Select-String '"name"' } else { exit 1 }
deliverables:
  - Full Vue admin MVP wired to Go APIs plus Demo3 smoke notes
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
