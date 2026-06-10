# 阶段 2：网关渠道升级 设计 spec

> 日期：2026-06-10
> 总纲：`2026-06-10-aigate-v2-roadmap-overview.md`
> 参考：cc-switch（卡片形态/预设/模型同步）、9Router（多账号轮询/Combo 回退链）、CPA（凭证解耦/账号体检）
> 前置依赖：阶段 0+1 完成（错误链路、缓存失效、租户上下文）

---

## 范围

**范围内**：渠道卡片化 UI、厂商预设模板、凭证池（多 Key 轮询）、模型自动同步、Combo 回退链、连通性测试与账号体检、网关路由升级。
**范围外**：订阅类账号 OAuth 接入（Claude Code/Codex device flow）、本地代理/熔断器、成本精细核算、渠道级 QPS 限流（留待运营需求明确后）。

## 数据模型

### channel 表（改造）

保留 `name/vendor/vendorTag/endpoint/status`，新增：

| 字段       | 类型           | 说明                               |
| ---------- | -------------- | ---------------------------------- |
| `priority` | int, default 0 | 同模型多渠道时的选择顺序，小者优先 |
| `icon`     | text, nullable | 预设带入或自定义                   |

`apiKey` 字段迁移至凭证表后**删除**（迁移脚本将存量 apiKey 转为该渠道的第一条凭证；系统未投产，无兼容包袱）。

### channel_credential 表（新增，CPA「凭证与配置解耦」）

| 字段                          | 说明                                                  |
| ----------------------------- | ----------------------------------------------------- |
| `id` / `channelId`            | 外键 channel                                          |
| `name`                        | 凭证别名（如「主账号」「备用-1」）                    |
| `apiKey`                      | 密钥（脱敏展示，仅尾 4 位）                           |
| `status`                      | `active / disabled / exhausted / error`               |
| `cooldownUntil`               | timestamp, nullable — 429 后冷却期，到期自动回 active |
| `lastCheckedAt` / `lastError` | 体检结果                                              |
| `sort`                        | 轮询顺序                                              |

### ai_model 表（扩展）

新增：`modelType`（`chat / embedding / rerank / image / speech`，抄 snail-ai 枚举，阶段 4 RAG 依赖 embedding/rerank 类型）、`sourceChannelId`（同步来源渠道，手工录入为 null）、`enabled`。

### model_combo / model_combo_item 表（新增，9Router Combo）

- `model_combo`：`id / organizationId / name(组织内唯一) / description / enabled`
- `model_combo_item`：`comboId / sort / channelId / modelName` — 有序回退链

Combo 名可直接作为网关请求中的 model 名使用。

## 网关路由逻辑（server/utils/gateway.ts 改造）

请求 model 名解析顺序：

1. **命中 Combo 名** → 按 `sort` 逐项尝试，单项失败（见下）切下一项，全部失败返回最后一项的错误。
2. **命中 ai_model** → 取所有启用且健康的来源渠道，按 `priority` 排序选第一个。
3. 都未命中 → 404「模型未注册」。

凭证选择：渠道内 `active` 凭证按 `sort` 轮询（内存游标，进程级；多实例部署时退化为随机起点，可接受）。

失败处理与凭证状态联动：

| 上游响应   | 动作                                                            |
| ---------- | --------------------------------------------------------------- |
| 401 / 403  | 凭证标 `error`，立即切下一凭证                                  |
| 429        | 凭证标 `exhausted` + `cooldownUntil`（默认 5 分钟），切下一凭证 |
| 5xx / 超时 | 不改凭证状态，本次请求切下一凭证；Combo 场景计入该项失败        |

渠道无可用凭证时视为渠道不健康，参与 Combo/优先级回退。

## API

| 端点                            | 说明                                                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channel` CRUD                  | 现有，去掉 apiKey 字段                                                                                                                                                        |
| `channel/[id]/credentials` CRUD | 凭证管理                                                                                                                                                                      |
| `POST channel/[id]/test`        | 连通性测试：用指定/全部凭证调上游 models 列表端点，返回延迟与结果                                                                                                             |
| `POST channel/[id]/sync-models` | 拉取上游 `/v1/models`（Anthropic 走 `/v1/models`，OpenAI 兼容走 `/v1/models`），按 modelId upsert 进 ai_model（`sourceChannelId` 关联；不删除已有，仅新增与更新 displayName） |
| `POST channel/checkup`          | 全渠道批量体检：逐凭证测连通，更新 status/lastCheckedAt/lastError，返回不健康清单（CPA-Manager-Plus「账号体检」）                                                             |
| `combo` CRUD                    | Combo 管理                                                                                                                                                                    |
| `GET channel/presets`           | 服务端常量预设列表（模式照抄 `mcp-tool/marketplace.get.ts`）                                                                                                                  |

预设清单（首批）：OpenAI、Anthropic、DeepSeek、智谱 GLM、Kimi/Moonshot、硅基流动、Ollama（本地）、自定义。预设含 `vendor/vendorTag/endpoint/icon/默认模型清单`。

## 前端页面

1. **渠道列表页改卡片**（`channels/index.vue`，cc-switch 形态）：卡片含厂商图标、名称、状态点（绿/黄/红 = 全部健康/部分凭证异常/全部异常）、凭证数、近 7 天调用量、启停开关、[测试] [详情] 按钮。顶部 [+ 新增渠道] 走预设向导。
2. **新增渠道向导**（Drawer 两步）：① 选预设（卡片选择器，含「自定义」）→ 自动填 vendor/vendorTag/endpoint；② 填名称 + 第一条凭证 Key → [测试并同步模型]（一次完成连通验证 + 模型入库）。
3. **渠道详情页**（`channels/[id]`，扩展现有）：Tab = 概览（现有统计）/ 凭证（列表 CRUD + 单独体检按钮 + 状态色）/ 模型（已同步模型列表、启停、[重新同步]）/ 设置（基础信息、priority）。
4. **Combo 管理页**（新增 `gateway/combos`，挂菜单「网关配置」组）：列表 + 编辑 Drawer（名称 + 有序「渠道/模型」链，支持拖拽排序）。
5. **模型页**（`models/index.vue`）：增加「类型」「来源渠道」「同步时间」列；保留阶段 0+1 的手工 CRUD。

## 验收标准

1. 从预设新建 DeepSeek 渠道，仅填一个 Key → 测试通过 → 模型自动出现在模型页。
2. 通过网关用该模型发起调用成功；禁用第一条凭证后流量自动走第二条。
3. 建 Combo「主力链」（渠道 A 模型 → 渠道 B 模型），人为让 A 返回 429 → 请求自动落到 B，A 凭证进入冷却。
4. 批量体检能正确标记失效 Key 并在列表中红色呈现。

## 风险

| 风险                       | 缓解                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| 各厂商 models 端点格式差异 | 同步逻辑按 vendor 分发解析器，首批只保证预设清单内厂商，自定义渠道允许同步失败（手工录入兜底） |
| 轮询游标在多实例下不均匀   | 单实例部署为主；文档注明多实例时为随机起点轮询                                                 |
| 凭证明文落库               | 与现状一致（apiKey 本就落库）；列表/详情全程脱敏，导出禁止携带明文                             |
