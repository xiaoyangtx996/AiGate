# Plan 09 — 部署与运维切片

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 9  
Outcome: 试点可部署环境（方式待定）  
Depends: Plan 03（可与 04/05/07a 并行推进）  
**Status: deferred** — 仓库已移除 Docker Compose / Dockerfile 等容器制品；当前只保证本地开发运行。部署实现等用户指定方式后再做，勿在未要求时恢复 Docker 文件。

```yaml
/goal
title: Add docker compose migrate and readiness for pilot deploy
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - docker-compose.yml
    - Dockerfile
    - scripts/
    - README.md
constraints:
  - Postgres with pgvector for MVP
  - services at minimum: postgres api worker gateway-or-newapi-sidecar frontend(static SPA) as separate containers
  - frontend and backend deploy separately; frontend only talks to api over HTTP
  - document env vars without committing secrets
  - health/readiness endpoints required for api
  - migrations runnable from clean volume
  - Docker build contexts point at backend/ and frontend/ respectively
success_criteria:
  - docker compose up brings postgres healthy and api ready on documented port
  - web service or static host is separate from api process
  - migrate from empty DB succeeds
  - README contains start stop migrate smoke commands for Windows and Linux notes
common_failure_modes:
  - assuming host-only Postgres without compose path
  - missing pgvector image
  - secrets baked into compose file
short_test:
  - shell: |
      if (Test-Path docker-compose.yml) { Get-Content docker-compose.yml | Select-String 'postgres|pgvector' } else { exit 1 }
      if (Test-Path README.md) { Get-Content README.md | Select-String 'compose|migrate' } else { exit 1 }
      if (Test-Path backend) { 'backend ok' } else { exit 1 }
      if (Test-Path frontend) { 'frontend ok' } else { exit 1 }
deliverables:
  - Compose Dockerfile env example and deploy smoke section in README
needs_auth:
  - Host Docker engine — required to actually run compose smoke
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
