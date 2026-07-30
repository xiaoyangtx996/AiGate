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
    - backend/go.mod
    - backend/cmd/
    - backend/internal/domain/
    - backend/internal/db/
    - backend/migrations/
    - frontend/.gitkeep
    - README.md
constraints:
  - greenfield All-in Go backend under backend/; do not restore Nuxt app tree
  - do not use sub2api as product base
  - frontend and backend are separated directories: backend/ = Go API; frontend/ = SPA placeholder only
  - domain must include Tenant, Organization(Department), Project as first-class entities
  - Project is asset container; org MVP depth is three levels
  - reserve frontend/ for Vue3 SPA with its own package.json later; do not implement UI or SSR now
  - PostgreSQL migrations must be reproducible from empty DB
  - every table and column must have detailed COMMENT ON (Chinese allowed); indexes that encode business intent should be commented too
  - keep public docs minimal; no fake CI commands
success_criteria:
  - backend/go.mod exists and (cd backend; go build ./...) succeeds
  - migrations create tenant organization/department project tables with COMMENT ON TABLE/COLUMN
  - README documents backend migrate/API stub and states frontend is separate Vue SPA under frontend/
  - git status shows scaffold files under backend/ and frontend/
  - frontend/ contains README stating SPA-only and no coupling to Go templates
common_failure_modes:
  - mixing legacy Nuxt files back into tree
  - domain model collapses Project into Organization
  - migrations not runnable on empty Postgres
  - putting Go module or Vue app at repo root instead of backend/ frontend/
short_test:
  - shell: |
      go version
      cd backend
      go build ./...
      go test ./internal/domain/...
deliverables:
  - Go module scaffold under backend/ with domain packages and SQL migrations
  - README with local Postgres migrate + API stub run steps
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
