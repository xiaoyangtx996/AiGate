# Plan 06 — 项目 Agent 与 AiGate Bot

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 6  
Outcome: 项目 Agent 绑 KB+MCP 可对话；管理 Bot 可查权限内用量  
Depends: Plan 05

```yaml
/goal
title: Ship project agents and scoped AiGate management bot
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  reference_capabilities: Snail-AI-agent-rag-mcp-boundaries
  target_paths:
    - internal/agent/
    - internal/bot/
constraints:
  - reference Snail AI capability boundaries only; do not require Java runtime
  - each Project can own Agents bound to that project KB and authorized MCP tools
  - AiGate Bot must respect admin scope (global vs org)
  - all model/tool calls go through gateway metering
  - no generic workflow orchestrator product scope
success_criteria:
  - create project agent bind KB+MCP and complete a cited RAG answer in smoke/test
  - bot answers a usage question only within caller permission scope
  - go test ./internal/agent/... ./internal/bot/... passes
common_failure_modes:
  - agent bypasses gateway and calls provider directly
  - bot leaks cross-org metrics
  - missing citation metadata from RAG path
short_test:
  - shell: |
      go test ./internal/agent/... ./internal/bot/...
deliverables:
  - Agent and Bot conversation APIs with permission and citation tests
needs_auth:
  - LLM provider credentials — required for live dialogue smoke
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
