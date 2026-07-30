# Plan 07a — 瘦控制台（Demo 0）

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 7a  
Outcome: 登录、组织、密钥、配额、调用日志/导出、渠道凭证、告警收件箱  
Depends: Plan 03（建议同时完成 03b）

```yaml
/goal
title: Ship thin Vue admin console for Demo0 key quota and logs
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - web/
    - cmd/api/
constraints:
  - Vue3 web/ in same repo; Chinese default copy
  - screens limited to login org stub users keys quota editor call logs alerts inbox channel provider credentials list
  - channel UI in thin console is list/edit credentials only; advanced routing later in 07b
  - no full KB MCP Agent UI in this milestone
  - all mutations go through authenticated APIs; no UI-only auth
  - include project or tenant context switcher stub if multi-tenant session exists
  - call log viewer supports date filter and CSV export for finance/audit secondary users
success_criteria:
  - operator can login create API key set quota see blocked call when exhausted and view log row
  - operator can view and update at least one upstream channel credential without seeing plaintext secret after save
  - alert inbox shows at least one quota threshold alert when 03b is present
  - CSV export of call logs works for a date range in smoke or test
  - README documents Demo0 click path
  - web package installs and build or dev script runs
common_failure_modes:
  - waiting for Plan 06 before any console
  - embedding full Nuxt feature set
  - missing quota parent-child conservation UX feedback
short_test:
  - shell: |
      go test ./...
      if (Test-Path web/package.json) { Get-Content web/package.json | Select-String '"name"' } else { exit 1 }
deliverables:
  - Thin Vue console for Demo0 plus smoke notes in README
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
