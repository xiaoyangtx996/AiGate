# Plan 06 — 项目 Agent 与 AiGate Bot

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 6  
Outcome: 项目 Agent 绑 KB+MCP 可对话；管理 Bot 可查权限内用量；Skill 扩展点预留  
Depends: Plan 04 + Plan 05

```yaml
/goal
title: Ship project agents and scoped AiGate management bot
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  reference_capabilities: Snail-AI-agent-rag-mcp-boundaries
  target_paths:
    - backend/internal/agent/
    - backend/internal/bot/
constraints:
  - reference Snail AI capability boundaries only; do not require Java runtime
  - each Project can own Agents bound to that project KB and authorized MCP tools
  - reserve optional Skill binding extension point in agent model without implementing Skill runtime
  - AiGate Bot must respect admin scope global vs org/tenant
  - all model/tool calls go through gateway metering and audit
  - no generic workflow orchestrator product scope
  - project membership ACL required for who can chat
success_criteria:
  - create project agent bind KB+MCP and complete a cited RAG answer in smoke/test
  - bot answers a usage question only within caller permission scope
  - agent schema or interface documents skill_ids optional field or hook
  - go test ./internal/agent/... ./internal/bot/... passes
common_failure_modes:
  - agent bypasses gateway and calls provider directly
  - bot leaks cross-tenant metrics
  - implementing full Skill optimizer in this milestone
short_test:
  - shell: |
      cd backend
      go test ./internal/agent/... ./internal/bot/...
deliverables:
  - Agent and Bot conversation APIs with permission citation tests and Skill extension point
needs_auth:
  - LLM provider credentials — required for live dialogue smoke
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
