# Plan 04 — 项目知识库 RAG

PRD: `.claude/prds/aigate-go-platform.prd.md` · Milestone 4  
Outcome: 项目可上传文档、向量化、检索；按项目隔离；本地对象存储  
Depends: Plan 03（嵌入/异步建议有 03b jobs）  
Decision: pgvector；本地目录对象存储

```yaml
/goal
title: Deliver project knowledge base with RAG retrieval isolation
inputs:
  repo: .
  prd: .claude/prds/aigate-go-platform.prd.md
  vector_backend: pgvector
  object_storage: local-configurable-path
  target_paths:
    - backend/internal/knowledge/
    - backend/internal/rag/
    - backend/internal/storage/
    - backend/migrations/
constraints:
  - knowledge base belongs to Project not global tenant dump
  - unauthorized project members cannot search or read chunks
  - document pipeline must enqueue jobs via internal/jobs from 03b
  - store blobs under configured local path with size limits
  - answers path must return citation metadata document id and span
  - use pgvector tables filtered by project_id or kb_id
success_criteria:
  - project admin can create KB and upload at least PDF or Markdown
  - embed job marks document ready and search returns relevant chunks
  - cross-project search denied in tests
  - failed documents can be retried via job
  - go test ./internal/knowledge/... ./internal/rag/... ./internal/storage/... passes
common_failure_modes:
  - blocking HTTP on large parse/embed
  - leaking chunks across projects without filter
  - storing files only in DB bytea without size policy
short_test:
  - shell: |
      cd backend
      go test ./internal/knowledge/... ./internal/rag/... ./internal/storage/...
deliverables:
  - KB upload parse embed search APIs with project ACL and local storage
needs_auth:
  - Embedding model credentials via gateway — required for live embed smoke
```

# 补齐 inputs → 交执行 agent；稳后可定时/Webhook。外部权限开头声明。
