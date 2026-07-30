# AiGate Plans Index

PRD: [`.claude/prds/aigate-go-platform.prd.md`](../prds/aigate-go-platform.prd.md)

Legacy Nuxt snapshot tag: `legacy-nuxt-aigate`

## Run order

| # | Plan | Goal title |
|---|---|---|
| 1 | [01-go-scaffold.md](./01-go-scaffold.md) | Bootstrap AiGate Go workspace with tenant org project domain |
| 2 | [02-tenant-rbac.md](./02-tenant-rbac.md) | Implement multi-tenant RBAC and request tenant context |
| 3 | [03-gateway-quota.md](./03-gateway-quota.md) | Ship OpenAI-compatible gateway with API keys and quota enforcement |
| 4 | [04-project-knowledge.md](./04-project-knowledge.md) | Deliver project knowledge base with RAG retrieval isolation |
| 5 | [05-mcp-assets.md](./05-mcp-assets.md) | Govern MCP tools as metered enterprise assets |
| 6 | [06-agents.md](./06-agents.md) | Ship project agents and scoped AiGate management bot |
| 7 | [07-admin-console.md](./07-admin-console.md) | Build admin console MVP for core AiGate operations |
| 8 | [08-skill-assets.md](./08-skill-assets.md) | Evolve skills into versioned memorable billable assets |

## How to run a plan

1. Open the plan markdown.
2. Copy the fenced `/goal` YAML block into an execution agent session.
3. Do **not** skip dependencies: finish N before N+1.
4. After success, mark the matching milestone `Status` in the PRD table to `complete` and set `Plan` link if needed.

## Restore legacy code (if needed)

```bash
git checkout legacy-nuxt-aigate
```
