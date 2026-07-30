BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_bases (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    name text NOT NULL CHECK (btrim(name) <> ''),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, project_id, name),
    UNIQUE (tenant_id, project_id, id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, created_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE knowledge_bases IS '项目级知识库；知识资产始终归属单一项目，不允许作为租户全局文档池使用';
COMMENT ON COLUMN knowledge_bases.id IS '知识库主键（UUID）';
COMMENT ON COLUMN knowledge_bases.tenant_id IS '所属租户 ID；与 project_id 共同构成强制隔离边界';
COMMENT ON COLUMN knowledge_bases.project_id IS '所属项目 ID；知识库、文档和检索均必须限定此项目';
COMMENT ON COLUMN knowledge_bases.name IS '知识库显示名称；同一项目内唯一';
COMMENT ON COLUMN knowledge_bases.created_by IS '创建知识库的员工 ID，且必须属于同一租户';
COMMENT ON COLUMN knowledge_bases.created_at IS '创建时间（UTC）';
COMMENT ON COLUMN knowledge_bases.updated_at IS '最后更新时间（UTC）';
CREATE INDEX knowledge_bases_project_idx ON knowledge_bases (tenant_id, project_id, created_at);
COMMENT ON INDEX knowledge_bases_project_idx IS '按租户和项目列出知识库，避免跨项目扫描';

CREATE TABLE knowledge_documents (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    knowledge_base_id uuid NOT NULL,
    filename text NOT NULL CHECK (btrim(filename) <> ''),
    media_type text NOT NULL CHECK (media_type IN ('text/markdown','text/plain')),
    object_key text NOT NULL UNIQUE,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','ready','failed')),
    last_error text NOT NULL DEFAULT '',
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, project_id, id),
    FOREIGN KEY (tenant_id, project_id, knowledge_base_id) REFERENCES knowledge_bases(tenant_id, project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, created_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT
);
COMMENT ON TABLE knowledge_documents IS '知识库上传文档元数据；原始文件保存在可配置本地对象目录，数据库仅保存对象键和处理状态';
COMMENT ON COLUMN knowledge_documents.id IS '文档主键（UUID）';
COMMENT ON COLUMN knowledge_documents.tenant_id IS '所属租户 ID；所有状态查询必须携带此隔离键';
COMMENT ON COLUMN knowledge_documents.project_id IS '所属项目 ID；与知识库复合外键共同阻止跨项目挂载';
COMMENT ON COLUMN knowledge_documents.knowledge_base_id IS '所属知识库 ID；必须与 tenant_id、project_id 同时匹配';
COMMENT ON COLUMN knowledge_documents.filename IS '上传时的原始文件名，仅用于展示，不参与对象路径拼接';
COMMENT ON COLUMN knowledge_documents.media_type IS '允许处理的内容类型；MVP 支持 Markdown 和纯文本';
COMMENT ON COLUMN knowledge_documents.object_key IS '本地对象存储中的不透明相对键，由服务生成而非客户端提供';
COMMENT ON COLUMN knowledge_documents.size_bytes IS '原始文件字节数，用于执行上传大小策略';
COMMENT ON COLUMN knowledge_documents.status IS '异步处理状态：queued、processing、ready 或 failed';
COMMENT ON COLUMN knowledge_documents.last_error IS '最近一次处理失败原因；成功后清空';
COMMENT ON COLUMN knowledge_documents.created_by IS '上传文档的员工 ID，且必须属于同一租户';
COMMENT ON COLUMN knowledge_documents.created_at IS '上传记录创建时间（UTC）';
COMMENT ON COLUMN knowledge_documents.updated_at IS '处理状态最后更新时间（UTC）';
CREATE INDEX knowledge_documents_kb_idx ON knowledge_documents (tenant_id, project_id, knowledge_base_id, created_at);
COMMENT ON INDEX knowledge_documents_kb_idx IS '按租户、项目和知识库读取文档及就绪状态';

CREATE TABLE knowledge_chunks (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    knowledge_base_id uuid NOT NULL,
    document_id uuid NOT NULL,
    chunk_index integer NOT NULL CHECK (chunk_index >= 0),
    content text NOT NULL CHECK (btrim(content) <> ''),
    span_start integer NOT NULL CHECK (span_start >= 0),
    span_end integer NOT NULL CHECK (span_end > span_start),
    embedding vector(384) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, document_id, chunk_index),
    FOREIGN KEY (tenant_id, project_id, document_id) REFERENCES knowledge_documents(tenant_id, project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, project_id, knowledge_base_id) REFERENCES knowledge_bases(tenant_id, project_id, id) ON DELETE CASCADE
);
COMMENT ON TABLE knowledge_chunks IS '项目文档切片与 pgvector 向量；检索 SQL 必须同时过滤 tenant_id、project_id 和 knowledge_base_id';
COMMENT ON COLUMN knowledge_chunks.id IS '文档切片主键（UUID）';
COMMENT ON COLUMN knowledge_chunks.tenant_id IS '所属租户 ID；向量检索第一层隔离键';
COMMENT ON COLUMN knowledge_chunks.project_id IS '所属项目 ID；禁止跨项目召回的强制过滤键';
COMMENT ON COLUMN knowledge_chunks.knowledge_base_id IS '所属知识库 ID；支持项目内单知识库检索';
COMMENT ON COLUMN knowledge_chunks.document_id IS '来源文档 ID，用于生成 citation';
COMMENT ON COLUMN knowledge_chunks.chunk_index IS '文档内从零开始的稳定切片序号';
COMMENT ON COLUMN knowledge_chunks.content IS '用于召回并返回的切片正文';
COMMENT ON COLUMN knowledge_chunks.span_start IS '切片在 UTF-8 文本中的起始字节偏移（含）';
COMMENT ON COLUMN knowledge_chunks.span_end IS '切片在 UTF-8 文本中的结束字节偏移（不含）';
COMMENT ON COLUMN knowledge_chunks.embedding IS '384 维语义向量；MVP 由可替换 Embedder 生成';
COMMENT ON COLUMN knowledge_chunks.created_at IS '切片生成时间（UTC）';
CREATE INDEX knowledge_chunks_scope_idx ON knowledge_chunks (tenant_id, project_id, knowledge_base_id, document_id);
COMMENT ON INDEX knowledge_chunks_scope_idx IS '在执行向量排序前先缩小到指定租户、项目和知识库';

COMMIT;
