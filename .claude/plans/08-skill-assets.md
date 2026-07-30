# Plan 08 — Skill 活资产（后置）

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 8  
Outcome: Skill 可沉淀调用记忆并支持版本；预留计费事件  
Depends: Plan 07

```yaml
/goal
title: Evolve skills into versioned memorable billable assets
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - internal/skill/
constraints:
  - do this only after MVP gateway tenant KB MCP agent console are usable
  - skill stores call-context memory and supports periodic optimization job hook
  - emit billable usage events even if pricing UI is later
  - skills are project or tenant assets with authorization like MCP
success_criteria:
  - skill version create/update and attach to agent works
  - invocation appends memory records retrievable by skill id
  - optimization job interface or stub can run without corrupting active version
  - usage event written for skill invoke
  - go test ./internal/skill/... passes
common_failure_modes:
  - optimizing in-place without version pin breaking prod agents
  - memory growth unbounded without retention policy
  - billing event missing skill_id dimension
short_test:
  - shell: |
      go test ./internal/skill/...
deliverables:
  - Skill memory versioning optimization-hook and usage-event APIs/tests
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
