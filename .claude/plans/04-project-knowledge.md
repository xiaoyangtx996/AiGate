# Plan 04 — 项目知识库 RAG

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 4  
Outcome: 项目可上传文档、向量化、检索；按项目隔离  
Depends: Plan 03

```yaml
/goal
title: Deliver project knowledge base with RAG retrieval isolation
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  vector_backend: TBD-pgvector-or-milvus
  target_paths:
    - internal/knowledge/
    - internal/rag/
    - migrations/
constraints:
  - knowledge base belongs to Project, not global tenant dump
  - unauthorized project members cannot search or read chunks
  - document pipeline must be async-friendly (job or worker hook)
  - answers path must be able to return citation metadata
success_criteria:
  - project admin can create KB and upload at least PDF or Markdown
  - embedding job marks document ready and search returns relevant chunks
  - cross-project search denied in tests
  - go test ./internal/knowledge/... ./internal/rag/... passes
common_failure_modes:
  - blocking HTTP on large parse/embed
  - leaking chunks across projects via shared collection without filter
  - no retry path for failed documents
short_test:
  - shell: |
      go test ./internal/knowledge/... ./internal/rag/...
deliverables:
  - KB upload/parse/embed/search APIs with project ACL tests
needs_auth:
  - Embedding model credentials via gateway — required for live embed smoke
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
