# Plan 07 — 管理控制台 MVP

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 7  
Outcome: 关键管理页可用：组织、密钥、项目、KB、MCP、Agent  
Depends: Plan 06

```yaml
/goal
title: Build admin console MVP for core AiGate operations
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - web/
    - cmd/api/
constraints:
  - console covers org keys projects KB MCP agents dashboards minimum
  - reuse existing APIs; no duplicate business logic in frontend
  - Chinese default UI copy acceptable
  - do not rebuild full Nuxt feature parity in one pass
success_criteria:
  - operator can complete path: create project -> upload doc -> create agent -> chat
  - IT admin can create key assign quota and see call log for one request
  - basic e2e or scripted smoke documented in README
common_failure_modes:
  - UI-only checks without API auth
  - pages for assets without project context switcher
short_test:
  - shell: |
      go test ./...
      if (Test-Path web/package.json) { Get-Content web/package.json | Select-String '"name"' } else { Write-Host 'web scaffold pending-or-present' }
deliverables:
  - Admin web MVP wired to Go APIs plus smoke notes
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
