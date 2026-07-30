# AiGate

Enterprise AI control plane — **All-in Go rebuild**.

## Docs

| Doc | Purpose |
|---|---|
| [`.claude/prds/aigate-go-platform.prd.md`](.claude/prds/aigate-go-platform.prd.md) | Product requirements + closed decisions |
| [`.claude/plans/README.md`](.claude/plans/README.md) | Milestone `/goal` plans + dependency graph |
| [`.claude/plan/plan-completeness-audit.md`](.claude/plan/plan-completeness-audit.md) | Completeness audit (remediations applied) |

## Architecture note

- **Backend**: Go (`cmd/`, `internal/`) — REST/SSE API, worker, gateway precheck
- **Frontend**: Vue3 SPA (`web/`) — independent build; calls backend HTTP APIs only
- **Not**: Nuxt/SSR fullstack, Go HTML admin as primary UI

## Start here

1. Read PRD Decisions (D1–D6 already closed; **D4 = frontend/backend separation**).
2. Run plans in order: **01 → 02 → 03 → 03b → 07a** for Demo 0.
3. Then **04 ∥ 05 → 06 → 07b**, with **09** anytime after 03.

Open a plan markdown, copy the `/goal` YAML into an execution agent.

## Legacy

```bash
git checkout legacy-nuxt-aigate
```
