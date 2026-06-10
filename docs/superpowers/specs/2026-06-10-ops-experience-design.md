# 阶段 6：运营体验补全 设计 spec

> 日期：2026-06-10
> 总纲：`2026-06-10-aigate-v2-roadmap-overview.md`
> 来源：UI 设计规范 v1.4 §5.1（仪表盘图表）/ §5.4（密钥详情）/ §5.5（日志详情）/ §5.14（操作审计）/ §5.18（提示词库）
> 前置依赖：阶段 0+1 完成；Prompts 沙箱依赖阶段 2 网关可用；与阶段 3/4/5 无依赖，可穿插实施

---

## 范围

**范围内**：四个独立工作包——Prompts 增强、操作审计增强、详情抽屉两件套（密钥/日志）、仪表盘图表补全。互不依赖，可单独排期。
**范围外**：Prompt 公共市场与上架审核流（UI 规范 §5.18.6，待资产市场统一模式落地后再说）、A/B 流量网关分流（先做并排对比，不做流量分配）、审计前后 diff 的全表覆盖（仅核心写操作）。

## WP1 Prompts 增强（UI 规范 §5.18 裁剪版）

**现状**：`prompts` 页有 CRUD + 版本历史（prompt_version 表）+ 导入导出，无变量插槽与调试能力。

### 数据模型

`prompt` 表新增：`variables`(json) — 变量声明数组 `[{ name, type(text/multiline/number/select), defaultValue, required, description, options? }]`；`category` — 分类（写作/代码/营销/客服/翻译/数据分析/其他）。

### 功能设计

1. **变量自动识别**：编辑器中 `{{var_name}}` 正则识别并高亮，自动同步到右侧变量声明面板（新检出的变量默认 type=text/required=true，删除占位符时面板对应项标记失效提示清理）。
2. **沙箱调试 Tab**（详情页内）：左侧变量填值表单（按 variables 渲染）→ 组装最终 prompt 预览 → 选择模型（ai_model 中 chat 类型）+ 温度 → 经网关调用 → 流式输出区；底部显示本次 token 消耗。调试调用走正常网关链路（计入日志与配额）。
3. **A/B 对比 Tab**：同一组变量填值，并排选择「两个版本」或「两个模型」各跑一次，左右对照输出；不落库评估记录（首版）。
4. **版本联动**：保存时若内容变化自动建 prompt_version 快照（沿用现有机制），沙箱/对比中可选任意历史版本。
5. **列表页**：卡片增加分类徽章 + 变量数 chips。

### API

`POST prompt/[id]/render`（变量填值 → 返回组装后文本，校验 required）；沙箱执行复用网关 chat 端点，前端组装请求；其余沿用现有 CRUD。

## WP2 操作审计增强（UI 规范 §5.14 裁剪版）

**现状**：模板自带 `logs` 表 + `operation-log` 页（server/middleware/logs.ts 记录请求级日志），无业务语义与前后 diff。

### 设计

1. **logs 表扩展**：`action`（语义动作枚举：org.create / channel.update / api-key.revoke / member.add / prompt.delete …）、`targetType` / `targetId`、`before`(json) / `after`(json)。
2. **落库方式**：新增 `auditLog(event, action, target, before, after)` 工具函数，在核心写 handler 中显式调用（不做自动拦截——middleware 拿不到 before 值）。首批覆盖：organization / channel / channel_credential / api_key / member / prompt / mcp_tool / agent / knowledge_base / tenant_package 的增改删。
3. **页面增强**（`operation-log`）：筛选增加 action 类型 / 操作者 / 目标类型 / 时间范围；行点击 → 详情抽屉展示 before/after 并排 JSON diff（新增绿/删除红/修改黄高亮）；敏感字段（apiKey/authConfig）在 before/after 中脱敏后才落库。
4. **保留与导出**：页面顶部「留存 365 天」角标；现有 log-cleanup 定时任务的清理阈值改为可配置（默认 365 天）；列表导出 CSV（带筛选条件）。
5. **只读约束**：审计页永不渲染删除入口（UI 规范 §14.2-9）。

## WP3 详情抽屉两件套

### 3.1 密钥详情抽屉（UI 规范 §5.4）

`api-keys` 列表行点击 → 右侧 Drawer：

- **生命周期时间线**：创建 → 启用 → 状态变更事件 → 过期/吊销（数据来源：api_key 自身字段 + WP2 审计记录中 targetId 匹配的事件）。
- **基础信息**：别名 / 前缀脱敏 / 所属用户与组织 / 有效期倒计时（≤7 天黄、≤1 天红）。
- **调用统计**：近 30 天调用量折线（api_log 按 key 聚合）+ Top 模型。
- **操作**：续期 / 禁用 / 吊销（吊销走二次确认）。

IP 白名单与每日上限：api_key 表新增 `ipWhitelist`(json) / `dailyLimit`(int, nullable) 字段 + 抽屉内编辑；网关侧（gateway.ts）校验来源 IP 与当日调用数，超限返回 403/429。

### 3.2 调用日志详情抽屉（UI 规范 §5.5 裁剪版）

`api-logs` / `my-api-logs` 行点击 → Drawer：

- 基础：时间 / 调用者 / 密钥 / 渠道与凭证（命中哪个，阶段 2 后有意义）/ 模型 / 状态码 / 延迟。
- **Token 拆分**：input / output（api_log 已有字段则直接展示；缺失字段补列）。
- 请求/响应体：**默认不落库**（隐私与体积），仅当系统设置开启「调试模式」时网关记录并展示（脱敏 Authorization 头）。
- trace_id 展示与复制。

## WP4 仪表盘图表补全（UI 规范 §5.1）

**现状**：dashboard 有基础统计卡。**设计**：补三张图（基于 api_log / billing_record 聚合端点）：

1. 近 30 天 Token 消耗趋势折线（按模型分层堆叠）。
2. Top 5 模型调用量柱状（带成本）。
3. Top 5 消耗组织/用户柱状（admin 视角组织、普通视角自己所在组织成员，遵循 principal 过滤）。

图表库沿用项目现有方案（@nuxt/ui 生态内已有图表则复用；没有则引入 ECharts 5 按需打包，与 UI 规范 §6.6 一致）。聚合端点加 60s 缓存（读多写少）。

## 验收标准

1. Prompt 写 `{{code}}{{language}}` → 变量面板自动出现两项 → 沙箱填值调试出流式结果且调用出现在日志中；A/B 两模型并排输出。
2. 修改渠道名称 → 操作审计出现 channel.update 记录，详情抽屉 diff 高亮 name 字段；apiKey 字段不以明文出现在任何审计记录。
3. 密钥抽屉时间线完整；设置 IP 白名单后非白名单来源调用被网关拒绝；dailyLimit=5 时第 6 次调用 429。
4. 日志详情抽屉展示 Token 拆分；调试模式关闭时无请求体。
5. 仪表盘三图有数据时正确渲染、空数据显示占位；组织切换后数据随视角变化。

## 风险

| 风险               | 缓解                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| 审计显式调用易遗漏 | spec 列明首批覆盖清单；code review 检查项 + 后续以 vitest 覆盖核心 handler 断言审计落库 |
| api_log 聚合查询慢 | 聚合端点限定时间窗（≤90 天）+ 复合索引（organizationId, createdAt）+ 60s 缓存           |
| 请求体落库隐私风险 | 默认关闭，开启需 admin 且系统设置中显著警示                                             |
