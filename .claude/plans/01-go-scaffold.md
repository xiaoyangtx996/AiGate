# Plan 01 — Go 仓库骨架与领域边界

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 1  
Outcome: 可编译 Go workspace；租户/组织/项目领域模型与迁移可跑

```yaml
/goal
title: Bootstrap AiGate Go workspace with tenant org project domain
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  legacy_ref: legacy-nuxt-aigate
  target_paths:
    - go.mod
    - cmd/
    - internal/domain/
    - internal/db/
    - migrations/
    - web/.gitkeep
    - README.md
constraints:
  - greenfield All-in Go; do not restore Nuxt app tree
  - do not use sub2api as product base
  - domain must include Tenant, Organization(Department), Project as first-class entities
  - Project is asset container; org MVP depth is three levels
  - reserve web/ directory for Vue3 console without implementing UI yet
  - PostgreSQL migrations must be reproducible from empty DB
  - keep public docs minimal; no fake CI commands
success_criteria:
  - go.mod module path exists and go build ./... succeeds
  - migrations create tenant organization/department project tables
  - README documents how to run migrate and start API stub
  - git status shows scaffold files under cmd/ internal/ migrations/ web/
common_failure_modes:
  - mixing legacy Nuxt files back into tree
  - domain model collapses Project into Organization
  - migrations not runnable on empty Postgres
short_test:
  - shell: |
      go version
      go build ./...
      go test ./internal/domain/...
deliverables:
  - Go module scaffold with domain packages and SQL migrations
  - README with local Postgres migrate + API stub run steps
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
