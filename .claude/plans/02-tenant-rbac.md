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
    - internal/auth/
    - internal/rbac/
    - internal/org/
    - cmd/api/
constraints:
  - borrow RuoYi-style role/menu/dept ideas only; do not port Java RuoYi wholesale
  - every data query must enforce tenant_id (or equivalent) isolation
  - primary roles must cover platform admin and project-capable member
  - no SSO in this milestone
success_criteria:
  - login issues session or JWT usable by API
  - admin can CRUD users/roles and attach users to org tree
  - cross-tenant read/write attempts return 403/404 in tests
  - go test ./internal/auth/... ./internal/rbac/... ./internal/org/... passes
common_failure_modes:
  - missing tenant filter on list endpoints
  - role checks only on UI not API
  - org tree cycles or orphan memberships
short_test:
  - shell: |
      go test ./internal/auth/... ./internal/rbac/... ./internal/org/...
deliverables:
  - Auth + RBAC + org tree APIs with isolation tests
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
