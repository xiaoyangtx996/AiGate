# Plan 02 — 多租户 RBAC 与身份

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 2  
Outcome: 管理员可管理用户/角色/组织树；请求带租户上下文  
Depends: Plan 01

```yaml
/goal
title: Implement multi-tenant RBAC and request tenant context
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  target_paths:
    - backend/internal/auth/
    - backend/internal/rbac/
    - backend/internal/org/
    - backend/cmd/api/
constraints:
  - borrow RuoYi-style role/menu/dept ideas only; do not port Java RuoYi wholesale
  - every data query must enforce tenant_id (or equivalent) isolation
  - MVP org depth is tenant -> department -> employee; Project is asset container not org level
  - support project membership ACL separate from department tree
  - primary roles must cover platform admin and project-capable member
  - no SSO in this milestone
  - every new/changed table and column must have detailed COMMENT ON (Chinese OK)
success_criteria:
  - login issues session or JWT usable by API
  - admin can CRUD users/roles and attach users to org tree
  - project membership can grant deny project resource access in tests
  - cross-tenant read/write attempts return 403/404 in tests
  - go test ./internal/auth/... ./internal/rbac/... ./internal/org/... passes
common_failure_modes:
  - missing tenant filter on list endpoints
  - role checks only on UI not API
  - org tree cycles or orphan memberships
short_test:
  - shell: |
      cd backend
      go test ./internal/auth/... ./internal/rbac/... ./internal/org/...
deliverables:
  - Auth + RBAC + org tree APIs with isolation tests
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
