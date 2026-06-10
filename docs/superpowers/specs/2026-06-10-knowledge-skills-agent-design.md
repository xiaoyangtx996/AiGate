# 阶段 4：知识库 / Skills / Agent 设计 spec

> 日期：2026-06-10
> 总纲：`2026-06-10-aigate-v2-roadmap-overview.md`
> 参考：snail-ai（RAG 四 Tab、文档状态机、存储实例、SKILL.md 形态、Agent 能力开关）
> 前置依赖：阶段 0+1 完成；阶段 2 完成（embedding/rerank 模型依赖 ai_model.modelType 与网关调用）
> 体量提示：本阶段实施时拆为两个计划——4A（知识库 RAG）、4B（Skills + Agent 增强），spec 合并一份保证模型一致性。

---

## 范围

**范围内**：知识库详情四 Tab、文档处理状态机与去重、切片存储（pgvector）、召回/问答测试、Skills 模块（SKILL.md + 文件树编辑器）、Agent 能力开关与三类绑定、对话中的 RAG 引用与工具调用步骤展示。
**范围外**：Milvus/ES 存储实例（枚举预留，仅实现 pgvector）、web 搜索能力、长期记忆、跨知识库联合搜索、文档级权限矩阵（知识库整体随组织隔离）。

## 一、知识库 RAG（4A）

### 数据模型

**storage_instance 表（新增，snail-ai 存储实例抽象）**：`id / name / category(vector) / type(pgvector，枚举预留 milvus/es) / config(json) / isDefault / status`。首版自动种子一条「内置 PGVector」默认实例（复用主库 + pgvector 扩展）。

**knowledge_base 表（扩展）**：

| 新增字段                              | 说明                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `storageInstanceId`                   | 引用存储实例                                                                       |
| `embeddingModelId` / `embeddingDim`   | 创建时选定 embedding 模型并**固化维度**（snail-ai 做法，防止换模型导致向量不兼容） |
| `rerankModelId`                       | nullable                                                                           |
| `chunkSize` / `chunkOverlap` / `topK` | RAG 策略，默认 1000 / 200 / 5                                                      |
| `dedupStrategy`                       | `reject / skip / overwrite`（按内容哈希去重时的处置）                              |

**document 表（扩展）**：`status`（`uploaded → parsing → chunking → embedding → ready / failed` 状态机）、`errorMsg`、`chunkCount`、`tokenCount`、`contentHash`（SHA-256，入库前查重走 dedupStrategy）。

**document_chunk 表（新增）**：`id / documentId / knowledgeBaseId / sort / content / tokenCount / contentHash / embedding(vector，pgvector 无维度约束列，维度由 KB 固化值保证) `。HNSW 索引 + knowledgeBaseId 过滤查询。

### 处理管线

上传 → 落对象（首版存本地磁盘 `data/uploads/`，路径进 document 表）→ 进程内异步任务依次推进状态：解析（首批支持 txt / md / pdf）→ 分块（按分隔符 + chunkSize/chunkOverlap）→ 经网关调用 KB 的 embedding 模型向量化 → ready。任一步失败置 `failed` + errorMsg，文档行提供 [重试]（从失败步重跑）。页面在存在处理中文档时 5 秒轮询。

### API

`knowledge-base/[id]` 下新增：`chunks`（分页列表，按文档筛选）、`POST search`（召回测试：query → embed → top-k 相似切片 + 相似度，可选 rerank）、`POST qa`（问答测试：召回 + 指定 chat 模型生成，返回回答与引用切片）、`documents/[docId]/retry`。`storage-instance` 只读列表端点（admin 可建新实例，表单仅 pgvector 连接串）。

### 页面

**知识库详情页**（重构 `knowledge-base` 进入详情 `knowledge-base/[id].vue`，snail-ai 四 Tab + 设置）：

| Tab      | 内容                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------- |
| 文档     | 列表（状态机徽章 + 进度 + errorMsg + 重试）、上传（多文件、重复内容按 dedupStrategy 提示）      |
| 切片     | 切片分页浏览（按文档筛选、内容预览、token 数）                                                  |
| 召回测试 | query 输入 → 命中切片卡片（相似度分数 + 来源文档跳转）                                          |
| 问答测试 | query + 模型选择 → 流式回答 + 引用切片列表                                                      |
| 设置     | RAG 策略（embedding 模型创建后只读，其余可改）、危险区（清空重建向量 / 删除知识库，输入确认词） |

列表页改卡片网格：文档数 / 切片数 / 状态汇总 / 绑定 Agent 数。

## 二、Skills（4B）

### 数据模型

**skill 表（新增）**：`id / organizationId / name / description / content(SKILL.md 正文) / version(int，每次保存自增，snail-ai 缓存一致性做法) / hasFiles / enabled`。name/description 从 SKILL.md frontmatter 解析，编辑正文时自动同步。
**skill_file 表（新增）**：`id / skillId / path / content`（首版仅文本文件）。

### 页面与 API

- `aigate/skills/index.vue`：卡片列表 + [新建]（空白模板 / zip 上传——解压解析 SKILL.md frontmatter，文本文件入 skill_file，二进制拒绝并提示）。
- `aigate/skills/[id].vue`：在线编辑器——左侧文件树（SKILL.md 置顶 + 支撑文件，可新建/重命名/删除），右侧编辑区（CodeMirror 6，markdown/通用语法高亮），保存即 version+1。
- API：skill CRUD + `skill/[id]/files` CRUD + `POST skill/import`（zip）。
- 菜单：「AI 资产管理」组新增 Skills。

## 三、Agent 增强（4B）

### 数据模型

**agent 表（扩展，snail-ai 能力开关矩阵）**：`memoryEnabled / mcpEnabled / skillEnabled / ragEnabled`（布尔）、`ragCallMode`（`auto / force`）、`shortTermMemorySize`（对话记忆窗口条数，默认 10）。
**绑定中间表（新增）**：`agent_knowledge_base`（≤5 个，服务端校验）、`agent_mcp_tool`、`agent_skill`。

### 对话执行（server/utils/agent-chat.ts 改造）

1. **system prompt 组装**：人设 + 启用 skill 的 SKILL.md 内容（多 skill 按绑定顺序拼接）。
2. **RAG**：`force` = 每轮先召回绑定知识库 top-k 注入上下文并返回引用；`auto` = 将「知识库检索」作为一个工具暴露给模型自主决定调用。
3. **MCP**：绑定的 sse/streamable_http 工具经 `tools/list` 注入工具清单，模型 tool-call 时服务端代理执行；stdio 工具在绑定列表中标灰（服务端不可执行）。
4. **记忆**：取 conversation_message 最近 shortTermMemorySize 条进上下文。

### 页面

- 创建/编辑页改向导（4 步 Drawer）：基础信息（含能力开关矩阵）→ 知识库绑定（仅 ragEnabled 时）→ MCP/Skill 绑定 → 确认。
- 对话页（`agents/chat`）增强：消息内折叠展示工具调用步骤（工具名/入参/结果摘要）；RAG 引用以编号角标 + 右侧引用卡片（文档名 + 切片预览 + 相似度）。

## 验收标准

1. 新建知识库（默认 pgvector 实例 + 选 embedding 模型）→ 上传 md/pdf → 状态机逐步推进至 ready，切片 Tab 可见内容；上传重复文件按策略提示。
2. 召回测试返回带相似度的切片；问答测试给出带引用的流式回答。
3. 故意中断 embedding（停渠道）→ 文档 failed + 错误信息 → 恢复后 [重试] 成功。
4. zip 导入一个含支撑文件的 Skill → 文件树完整 → 在线改 SKILL.md 保存后 version 自增。
5. 创建 Agent：开 RAG(force) + 绑 1 知识库 + 1 个 sse MCP + 1 个 Skill → 对话中可见引用角标与工具调用步骤；关闭 ragEnabled 后引用消失。
6. 绑定第 6 个知识库被服务端拒绝。

## 风险

| 风险                     | 缓解                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| pdf 解析质量参差         | 首版用纯文本抽取（pdf-parse 级别），扫描件明确提示「不支持」；解析失败走 failed + errorMsg |
| 进程内任务队列重启丢任务 | 启动时扫描非终态文档置 failed（可重试），不做分布式队列                                    |
| embedding 维度与模型不符 | KB 创建时实际调用一次模型探测维度并固化；后续模型不可改                                    |
| 多 skill 拼接超长        | system prompt 组装时统计 token，超过模型上下文 80% 时报错提示解绑                          |
