# AiGate Plans Index

PRD: [`.claude/prds/aigate-go-platform.prd.md`](../prds/aigate-go-platform.prd.md)

Legacy Nuxt snapshot tag: `legacy-nuxt-aigate`

## Dependency graph (optimized)

```text
01 → 02 → 03 ─┬→ 03b ─→ 07a          (Demo 0; 07a = Vue SPA)
              ├→ 04 ──┐
              ├→ 05 ──┴→ 06 → 07b     (Demo 2 → 3; backend APIs then SPA pages)
              └→ 09                   (deploy api/worker/web separately after 03)
06 / 07b → 08                         (Skill, post-MVP)
```

Frontend/backend separation (see PRD D4):

```text
backend/    # Go API + migrations
frontend/   # Vue3 SPA only
```

**Schema comments (mandatory):** every new/changed table and column in `backend/migrations/` must include detailed `COMMENT ON TABLE` / `COMMENT ON COLUMN` (Chinese OK). Do not ship uncommented DDL.

## Run order

| # | Plan | Goal title | Depends |
|---|---|---|---|
| 1 | [01-go-scaffold.md](./01-go-scaffold.md) | Bootstrap AiGate Go workspace with tenant org project domain | — |
| 2 | [02-tenant-rbac.md](./02-tenant-rbac.md) | Implement multi-tenant RBAC and request tenant context | 01 |
| 3 | [03-gateway-quota.md](./03-gateway-quota.md) | Ship OpenAI-compatible gateway with API keys and quota enforcement | 02 |
| 3b | [03b-audit-jobs-alerts.md](./03b-audit-jobs-alerts.md) | Add unified audit events job runner and quota threshold alerts | 03 |
| 4 | [04-project-knowledge.md](./04-project-knowledge.md) | Deliver project knowledge base with RAG retrieval isolation | 03 (+03b jobs) |
| 5 | [05-mcp-assets.md](./05-mcp-assets.md) | Govern MCP tools as metered enterprise assets | 03 (+03b audit) — **not** 04 |
| 6 | [06-agents.md](./06-agents.md) | Ship project agents and scoped AiGate management bot | 04 + 05 |
| 7a | [07a-console-thin.md](./07a-console-thin.md) | Ship thin Vue admin console for Demo0 key quota and logs | 03 (+03b) |
| 7b | [07-admin-console.md](./07-admin-console.md) | Build full admin console MVP for projects KB MCP agents | 06 + 07a |
| 8 | [08-skill-assets.md](./08-skill-assets.md) | Evolve skills into versioned memorable billable assets | 07b |
| 9 | [09-deploy-ops.md](./09-deploy-ops.md) | Deploy/ops slice（**deferred**：仓库不维护 Docker；方式待定） | 03 |

## Demo path

1. **Demo 0**: 03 + 03b + 07a  
2. **Demo 1**: +04  
3. **Demo 2**: +04 + 05 + 06（RAG + MCP + Agent）  
4. **Demo 3**: +07b +09  

## How to run a plan

1. Open the plan markdown.
2. Copy the fenced `/goal` YAML into an execution agent session.
3. Respect Depends column; `04` and `05` may run in parallel after `03`/`03b`.
4. After success, mark the matching milestone `Status` in the PRD to `complete`.

## Restore legacy code

```bash
git checkout legacy-nuxt-aigate
```
