# 阶段 9：实现修复与扫尾 设计 spec

> 日期：2026-06-11
> 总纲：`2026-06-10-aigate-v2-roadmap-overview.md`
> 来源：2026-06-11 四路独立验收审计——阶段 0+1 至 8 的实现核验结论（不采信自评，逐条代码取证）
> 性质：前 8 阶段骨架已落地，本 spec 收口审计发现的 7 项阻断缺口 + 功能缺口 + 清理残留。按优先级分 6 个工作包，WP1-WP4 为发布前必修，WP5-WP6 可随后迭代。

---

## WP1 网关 Token 计量真实化（最高优先：一处假数据污染四个模块）

**现状**：`server/api/gateway/[...path].ts:165-166` 写日志时 `inputTokens/outputTokens` 写死 0。日志抽屉 Token 拆分、仪表盘 Token 图、配额消耗、Bot 用量统计全部基于假数据。

**设计**：

1. **非流式**：解析上游响应 usage 字段——OpenAI 兼容 `usage.prompt_tokens/completion_tokens`、Anthropic `usage.input_tokens/output_tokens`，按渠道 vendor 分发解析。
2. **流式**：SSE 透传时旁路累积——OpenAI 兼容在尾部 `data` 块（或 `stream_options.include_usage` 注入后）取 usage；Anthropic 取 `message_delta.usage`。解析失败时回退估算（字符数/4）并在日志行标记 `tokensEstimated: true`。
3. **配额联动**：`consumeQuota` 改用真实 token 值；历史 0 值数据不回填（无法重建）。
4. **回归**：gateway-proxy 测试补流式/非流式两类 usage 断言。

**验收**：经网关发起一次真实调用，api_log 行 input/output tokens 非 0 且与上游计费面板同量级；仪表盘趋势图出现真实数据。

## WP2 知识库 RAG 真实化（4A 的灵魂）

**现状**：embedding 用字符哈希伪向量（`knowledge-rag.ts:34-44,149`），检索是内存关键词伪余弦（`:181-197`），pgvector/HNSW 建而未用；QA 直接拼切片不调模型（`qa.post.ts:26-29`）；文档解析只做 utf8 toString（pdf 乱码）。

**设计**：

1. **真实 embedding**：`processDocument` 的向量化步骤改为经网关调用 KB 固化的 embedding 模型（批量分组，每批 ≤ 32 切片）；写入 `document_chunk.embedding`。`embeddingDim` 改为创建 KB 时实际调用一次模型探测维度（替换现在的按名猜测）。
2. **pgvector 检索**：`searchKnowledgeBase` 改为 SQL 向量查询（`embedding <=> query_vec` 余弦距离，HNSW 命中，`knowledgeBaseId` 过滤，top-k）；KB 配置了 rerankModelId 时对候选做 rerank 重排。
3. **QA 调 chat 模型**：召回后组装上下文经网关调用所选 chat 模型，SSE 流式返回 + 引用切片列表。
4. **文档解析**：txt/md 按 utf8；pdf 引入 `pdf-parse`（或同级轻量库）抽文本；解析失败置 failed + errorMsg；扫描件明确提示不支持。
5. **管线健壮性**：上传改为异步触发处理（响应先返回，状态由轮询获取）；新增 nitro 启动插件扫描非终态文档置 failed（可重试）；KB 详情页存在处理中文档时 5 秒轮询。
6. **设置 Tab 危险区**：删除知识库改输入确认词（KB 名）；新增「清空重建向量」动作（清 chunk → 全部文档重跑管线）。

**验收**：上传一份真实 PDF → ready 后切片内容正确；召回测试返回真实相似度排序；问答测试流式输出且引用准确；停掉 embedding 渠道 → 文档 failed → 恢复后重试成功。

## WP3 调度与测试收口

1. **告警定时调度**：nitro `scheduledTasks` 两档——每 5 分钟跑实时类（异常调用/MCP 不可用/渠道健康），每日跑日界类（密钥/租户到期、KB 存储、配额周期）；`runAlertChecks` 按档拆分；保留手动 POST 端点。
2. **e2e 迁移 username 流程**：`e2e/fixtures/auth.ts` 改为管理端 API 建用户（username + 派生 email）+ username 选择器登录；删除 sign-up/magic-link 用例；smoke 全量过一遍。

**验收**：本地起服务不做任何手动触发，密钥设 1 天后过期 → 次日档任务产生告警；`pnpm test:e2e` 全绿。

## WP4 审计与小修补

1. `channel/[id].delete.ts` 补 `auditLog`（10 类资源唯一漏网）。
2. 审计页顶部渲染「留存 365 天」角标（读 retention 设置实际值）。
3. `batch-install.post.ts` 包 `db.transaction`（失败整体回滚）。
4. `mcp-tool/[id]/versions` 补新增版本端点 + 详情页版本 Tab 的「新增版本」表单。
5. 清理残留：i18n 删 magicLink/forgotPassword/verifyEmailSent 等死 key；删 `emailFormSchema/forgotPasswordFormSchema`。

## WP5 两个向导与表单补全

1. **渠道新增两步向导**（Drawer）：① 预设选择 → ② 名称 + 首条凭证 + 「测试并同步模型」按钮（串行调 test → sync-models，结果内联反馈）。替换现单步 Modal。
2. **MCP 注册三步向导**（Drawer）：① 基础信息 → ② 服务配置（transportType 切换字段组：stdio 的 command/args/env、sse/streamable_http 的 serverUrl/authType/authConfig）→ ③ 连接测试（stdio 跳过）。补齐现表单缺失的全部传输层字段。
3. 私有 MCP 详情页配置 Tab 改可编辑 + 内联「连接测试」。

## WP6 UI 细节批量扫尾（可拆散随迭代）

| 项       | 内容                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 设置页   | 补「预警规则」第 7 Tab（阈值/启停，读写 alert-rule-templates 对应 setting key）；各项 tooltip；Tab 顶「上次修改：人·时间」     |
| Prompt   | A/B 支持两版本对比 + 沙箱可选历史版本；沙箱改流式 + 显示本次 token；列表改卡片 + 变量数 chips                                  |
| 仪表盘   | Token 趋势按模型堆叠；Top5 模型柱状叠加成本轴                                                                                  |
| 密钥抽屉 | 30 天调用折线渲染；有效期 ≤7 黄 / ≤1 红配色                                                                                    |
| 日志抽屉 | 显示命中渠道/凭证（api_log 已有 provider 数据）                                                                                |
| 渠道卡片 | 近 7 天调用量、启停开关；models 页补来源渠道/同步时间列                                                                        |
| 组织树   | 到期倒计时 ≤14 黄 / ≤7 红；停用节点置灰                                                                                        |
| Skill    | 编辑器换 CodeMirror 6；文件树重命名                                                                                            |
| Agent    | 创建改 4 步向导；KB 绑定按 ragEnabled 显隐；对话工具步骤折叠 + 正文引用编号角标                                                |
| Bot      | Drawer 宽改 480px；SSE 真流式（透传模型流）；restricted 改「空集且全局有数据」判定                                             |
| 其他     | Combo 拖拽排序；model_combo 组织内 unique 索引；sync-models 补 Anthropic 解析器；组织树页（organizations）支持生命周期字段编辑 |

## 实施顺序与依赖

WP1 → WP2（QA/检索依赖网关与 token 计量正确）→ WP3 ∥ WP4（互不依赖，可并行）→ WP5 → WP6。
WP1-WP4 完成即可视为「8 阶段真实达标」；WP5-WP6 为体验补全。

## 风险

| 风险                            | 缓解                                                                |
| ------------------------------- | ------------------------------------------------------------------- |
| 流式 usage 各厂商格式差异       | 按 vendor 分发解析 + 字符估算兜底（标记 estimated），不阻塞日志写入 |
| 真实 embedding 后历史伪向量混存 | WP2.6 的「清空重建向量」即迁移工具；上线后对所有既有 KB 提示重建    |
| e2e 改造牵连 CI                 | 先本地全绿再合入；保留 smoke 作为兜底门禁                           |
