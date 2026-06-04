# AiGate Phase 2: 核心功能补全实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现所有页面完整 CRUD，补全缺失交互，用户体验提升 80%

**Architecture:** 基于现有 CRUD 模式扩展，遵循 DRY 原则创建可复用的表单和列表组件，统一数据获取和状态管理

**Tech Stack:** Vue 3, Nuxt 4, @nuxt/ui, Pinia, Drizzle ORM

---

## 📋 Phase 2 任务清单（约 15 天）

### Task Group 1: Agent 智能体管理增强（2天）

#### Task 1.1: Agent 编辑功能

**Files:**
- Create: `AiGate-app/app/pages/aigate/agents/edit.vue`
- Modify: `AiGate-app/app/pages/aigate/agents/index.vue`

- [ ] **Step 1: 创建编辑页面**

创建 `AiGate-app/app/pages/aigate/agents/edit.vue`：
```vue
<script setup lang="ts">
const route = useRoute()
const { updateAgent } = useAigateApi()
const { successToast, errorToast } = useAppToast()
const router = useRouter()

const { data: agent } = await useAsyncData(`agent-${route.params.id}`, async () => {
  const res = await $fetch(`/api/aigate/agent/${route.params.id}`)
  return res.data
})

if (!agent.value) {
  errorToast('Agent not found')
  router.push('/aigate/agents')
}

const form = reactive({
  name: agent.value?.name || '',
  description: agent.value?.description || '',
  model: agent.value?.model || 'gpt-4o',
  systemPrompt: agent.value?.systemPrompt || '',
  temperature: agent.value?.temperature || 30,
  maxTokens: agent.value?.maxTokens || 4096,
  tags: agent.value?.tags || [],
})

const saving = ref(false)

async function handleSave() {
  if (!form.name) return
  saving.value = true
  try {
    await updateAgent({ id: route.params.id as string, ...form })
    successToast('Agent updated')
    router.push('/aigate/agents')
  }
  catch (err) {
    errorToast('Failed to update agent')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-center gap-3">
      <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/agents" />
      <h2 class="text-xl font-bold">Edit Agent</h2>
    </div>
    <UCard>
      <div class="space-y-4">
        <UFormField label="Agent Name" required>
          <UInput v-model="form.name" placeholder="e.g., Code Review Agent" />
        </UFormField>
        <UFormField label="Description">
          <UTextarea v-model="form.description" :rows="2" />
        </UFormField>
        <UFormField label="Model">
          <USelect v-model="form.model" :items="[
            { label: 'GPT-4o', value: 'gpt-4o' },
            { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            { label: 'Claude Sonnet 4', value: 'claude-sonnet-4' },
          ]" />
        </UFormField>
        <UFormField label="System Prompt">
          <UTextarea v-model="form.systemPrompt" :rows="6" />
        </UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="`Temperature: ${(form.temperature / 100).toFixed(2)}`">
            <UInput v-model.number="form.temperature" type="range" :min="0" :max="100" />
          </UFormField>
          <UFormField label="Max Tokens">
            <UInput v-model.number="form.maxTokens" type="number" />
          </UFormField>
        </div>
        <UButton :loading="saving" @click="handleSave">Save</UButton>
      </div>
    </UCard>
  </div>
</template>
```

- [ ] **Step 2: 在列表页添加编辑按钮**

Modify `AiGate-app/app/pages/aigate/agents/index.vue`:
```typescript
// 添加 editAgent 函数
function editAgent(row: any) {
  return navigateTo(`/aigate/agents/edit/${row.id}`)
}

// 在模板中添加编辑按钮
<UButton size="sm" variant="outline" icon="lucide:edit" @click="editAgent(agent)" />
```

- [ ] **Step 3: 测试编辑功能**

Run: `pnpm dev`
Navigate to `/aigate/agents`, click edit, verify form works

- [ ] **Step 4: Commit**

```bash
git add AiGate-app/app/pages/aigate/agents/edit.vue
git add AiGate-app/app/pages/aigate/agents/index.vue
git commit -m "feat(agents): add edit functionality"
```

---

#### Task 1.2: Agent 对话体验完整化

**Files:**
- Modify: `AiGate-app/app/pages/aigate/agents/chat.vue`

- [ ] **Step 1: 完善消息发送逻辑**

Replace current sendMessage implementation:
```typescript
async function sendMessage() {
  if (!inputText.value.trim() || sending.value) return
  
  const userMsg = {
    role: 'user',
    content: inputText.value.trim(),
    time: new Date().toISOString(),
  }
  
  messages.value.push(userMsg)
  const msg = inputText.value.trim()
  inputText.value = ''
  sending.value = true
  
  try {
    const res = await chatWithAgent(selectedAgent.value.id, msg, conversationId.value)
    conversationId.value = res.data?.conversationId
    
    // 流式响应处理（如果支持）
    if (res.data?.stream) {
      const reader = res.data.stream.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        assistantMsg += chunk
        
        // 更新最后一条消息
        const lastMsg = messages.value[messages.value.length - 1]
        if (lastMsg?.role === 'assistant') {
          lastMsg.content = assistantMsg
        }
        else {
          messages.value.push({
            role: 'assistant',
            content: assistantMsg,
            time: new Date().toISOString(),
          })
        }
      }
    }
    else {
      messages.value.push({
        role: 'assistant',
        content: res.data?.message || 'No response',
        time: new Date().toISOString(),
      })
    }
  }
  catch (err) {
    messages.value.push({
      role: 'assistant',
      content: `Error: ${err instanceof Error ? err.message : 'Request failed'}`,
      time: new Date().toISOString(),
    })
  }
  finally {
    sending.value = false
    // 滚动到底部
    nextTick(() => {
      const container = document.querySelector('.messages-container')
      container?.scrollTo(0, container.scrollHeight)
    })
  }
}
```

- [ ] **Step 2: 添加 Markdown 渲染**

```vue
<template>
  <!-- ... -->
  <div v-for="(msg, idx) in messages" :key="idx" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
    <div class="max-w-[80%] rounded-lg p-4" :class="msg.role === 'user' ? 'bg-primary text-white' : 'bg-elevated'">
      <Markdown :content="msg.content" />
    </div>
  </div>
</template>
```

Add import:
```typescript
import { Markdown } from '@nuxtjs/mdc'
```

- [ ] **Step 3: 添加对话历史管理**

```typescript
// 保存对话到 localStorage
watch(conversationId, (newId) => {
  if (newId && selectedAgent.value) {
    const key = `conversation-${selectedAgent.value.id}`
    const convs = JSON.parse(localStorage.getItem(key) || '[]')
    if (!convs.find((c: any) => c.id === newId)) {
      convs.unshift({ id: newId, title: messages.value[0]?.content.substring(0, 50) })
      localStorage.setItem(key, JSON.stringify(convs.slice(0, 20)))
    }
  }
})
```

- [ ] **Step 4: 测试对话功能**

Run: `pnpm dev`
Test sending messages, verify streaming works

- [ ] **Step 5: Commit**

```bash
git add AiGate-app/app/pages/aigate/agents/chat.vue
git commit -m "feat(agents): enhance chat experience with streaming and markdown"
```

---

#### Task 1.3: Agent 日志查看页面

**Files:**
- Create: `AiGate-app/app/pages/aigate/agents/[id]/logs.vue`

- [ ] **Step 1: 创建日志页面**

(类似 api-logs 页面的实现，但筛选特定 agent)

- [ ] **Step 2: 添加路由**

Nuxt 自动路由，无需额外配置

- [ ] **Step 3: 在 Agent 列表页添加日志按钮**

```vue
<UButton size="sm" variant="ghost" icon="lucide:file-text" :to="`/aigate/agents/${agent.id}/logs`" />
```

- [ ] **Step 4: 测试并提交**

```bash
git add AiGate-app/app/pages/aigate/agents/[id]/logs.vue
git commit -m "feat(agents): add agent logs page"
```

---

### Task Group 2: Channel 渠道增强（2天）

#### Task 2.1: Channel 详情页

**Files:**
- Create: `AiGate-app/app/pages/aigate/channels/[id].vue`

- [ ] **Step 1: 创建详情页**

展示完整配置、使用统计、健康状态

- [ ] **Step 2: 在列表页添加查看按钮**

```vue
<UButton size="sm" variant="ghost" icon="lucide:eye" :to="`/aigate/channels/${channel.id}`" />
```

- [ ] **Step 3: 测试并提交**

```bash
git commit -m "feat(channels): add channel detail page"
```

---

#### Task 2.2: Channel 测试连通性

**Files:**
- Modify: `AiGate-app/server/api/aigate/channel/health-check.post.ts`

- [ ] **Step 1: 实现实际测试逻辑**

发送测试请求到渠道 endpoint

- [ ] **Step 2: 返回详细结果**

包括延迟、状态码、错误信息

- [ ] **Step 3: 前端展示详情**

- [ ] **Step 4: 测试并提交**

```bash
git commit -m "feat(channels): enhance health check with detailed results"
```

---

### Task Group 3: API Key 增强（1.5天）

#### Task 3.1: API Key 权限绑定

**Files:**
- Modify: `AiGate-app/server/api/aigate/api-key/index.post.ts`
- Modify: `AiGate-app/app/pages/aigate/api-keys/index.vue`

- [ ] **Step 1: 后端添加角色字段**

在插入/更新时支持角色 ID

- [ ] **Step 2: 前端添加角色选择器**

在表单中添加角色多选

- [ ] **Step 3: 测试权限绑定**

- [ ] **Step 4: 提交**

```bash
git commit -m "feat(api-keys): add role binding to API keys"
```

---

#### Task 3.2: API Key 使用统计

**Files:**
- Modify: `AiGate-app/server/api/aigate/api-key/index.get.ts`
- Modify: `AiGate-app/app/pages/aigate/api-keys/index.vue`

- [ ] **Step 1: 后端返回统计信息**

添加 `calls`, `cost`, `lastUsed` 等字段

- [ ] **Step 2: 前端展示统计卡片和图表**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(api-keys): add usage statistics"
```

---

### Task Group 4: Knowledge Base 完整化（2天）

#### Task 4.1: 文档上传功能

**Files:**
- Modify: `AiGate-app/server/api/aigate/knowledge-base/[id]/documents/index.post.ts`
- Modify: `AiGate-app/app/pages/aigate/knowledge-base/index.vue`

- [ ] **Step 1: 后端处理文件上传**

使用 `formidable` 或 `multer` 处理 multipart

- [ ] **Step 2: 前端添加文件选择器**

```vue
<UFormField label="Upload Document">
  <input type="file" @change="handleFileSelect" multiple accept=".pdf,.txt,.md" />
</UFormField>
```

- [ ] **Step 3: 显示上传进度**

```vue
<UProgress v-if="uploading" :value="uploadProgress" />
```

- [ ] **Step 4: 测试上传功能**

- [ ] **Step 5: 提交**

```bash
git commit -m "feat(kb): add document upload with progress"
```

---

#### Task 4.2: 知识库编辑功能

- [ ] **Step 1: 创建编辑页面**

类似 Task 1.1

- [ ] **Step 2: 实现更新 API**

- [ ] **Step 3: 测试并提交**

```bash
git commit -m "feat(kb): add knowledge base editing"
```

---

### Task Group 5: Prompts 版本管理（1天）

#### Task 5.1: Prompt 版本历史

**Files:**
- Create: `AiGate-app/app/pages/aigate/prompts/[id]/versions.vue`
- Modify: `AiGate-app/server/api/aigate/prompt/index.post.ts`

- [ ] **Step 1: 创建版本表** (如需要)

修改 schema 或创建新表

- [ ] **Step 2: 保存版本历史**

每次更新时创建新版本记录

- [ ] **Step 3: 展示版本列表和对比**

- [ ] **Step 4: 提交**

```bash
git commit -m "feat(prompts): add version history and rollback"
```

---

#### Task 5.2: Prompt 导入/导出

- [ ] **Step 1: 实现 JSON 导出**

- [ ] **Step 2: 实现批量导入**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(prompts): add import/export functionality"
```

---

### Task Group 6: MCP Tools 完善（2天）

#### Task 6.1: MCP 连接测试

**Files:**
- Modify: `AiGate-app/server/api/aigate/mcp-tool/index.post.ts`

- [ ] **Step 1: 实现 SSE/HTTP 连接测试**

```typescript
async function testMcpConnection(config: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (config.type === 'sse') {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
        signal: AbortSignal.timeout(5000),
      })
      return { success: response.ok }
    }
    else {
      // HTTP 测试
      const response = await fetch(config.endpoint)
      return { success: response.ok }
    }
  }
  catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

- [ ] **Step 2: 前端添加测试按钮和状态展示**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(mcp): add connection testing"
```

---

#### Task 6.2: MCP Marketplace 填充

- [ ] **Step 1: 创建工具数据**

预设 10-20 个常用 MCP 工具

- [ ] **Step 2: 实现安装功能**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(mcp): populate marketplace with popular tools"
```

---

### Task Group 7: 其他页面增强（3天）

#### Task 7.1: Alerts 规则配置

**Files:**
- Create: `AiGate-app/app/pages/aigate/alerts/rules.vue`
- Modify: `AiGate-app/app/db/schema.ts` (添加 alert_rules 表)

- [ ] **Step 1: 添加告警规则表**

```typescript
export const alertRule = pgTable('alert_rule', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  type: text('type').notNull(),
  condition: jsonb('condition').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  notifyChannels: jsonb('notify_channels').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

- [ ] **Step 2: 创建 CRUD API**

- [ ] **Step 3: 创建规则管理页面**

- [ ] **Step 4: 提交**

```bash
git commit -m "feat(alerts): add alert rules management"
```

---

#### Task 7.2: Billing 详情页

**Files:**
- Create: `AiGate-app/app/pages/aigate/billing/[id].vue`

- [ ] **Step 1: 创建账单详情页**

展示费用明细、Token 使用、支付记录

- [ ] **Step 2: 添加导出功能**

PDF/Excel 导出

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(billing): add billing details page with export"
```

---

#### Task 7.3: Dashboard 时间筛选

- [ ] **Step 1: 前端添加时间选择器**

```vue
<USelect v-model="timeRange" :items="[
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]" />
```

- [ ] **Step 2: 后端支持时间范围参数**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(dashboard): add time range filter"
```

---

#### Task 7.4: Gateway 管理界面（新增）

**Files:**
- Create: `AiGate-app/app/pages/aigate/gateway/index.vue`
- Create: `AiGate-app/app/pages/aigate/gateway/routes.vue`

- [ ] **Step 1: 创建 Gateway 概览页**

展示实时请求、路由规则、负载状态

- [ ] **Step 2: 创建路由规则管理**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(gateway): add gateway management UI"
```

---

#### Task 7.5: 操作日志页面（新增）

**Files:**
- Create: `AiGate-app/app/pages/system-settings/operation-log/index.vue`

- [ ] **Step 1: 创建操作日志页面**

展示用户操作历史

- [ ] **Step 2: 添加过滤和导出**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(logs): add operation log page"
```

---

## Phase 2 完成检查清单

### 功能完整性
- [ ] Agents: 列表、创建、编辑、删除、对话、日志 ✅
- [ ] Channels: 列表、增删改、详情、健康检查、测试 ✅
- [ ] API Keys: 列表、增删改、权限绑定、使用统计 ✅
- [ ] Knowledge Base: 列表、创建、编辑、文档上传、删除 ✅
- [ ] Prompts: 列表、增删改、版本管理、导入/导出 ✅
- [ ] MCP Tools: 列表、增删改、连接测试、Marketplace ✅
- [ ] Alerts: 列表、已读、规则配置、告警历史 ✅
- [ ] Billing: 列表、详情、生成、导出 ✅
- [ ] Dashboard: 数据展示、时间筛选、刷新 ✅
- [ ] Members: 列表、添加、删除 ✅
- [ ] Organizations: 树形展示、详情 ✅
- [ ] Gateway: 概览、规则管理 ✅
- [ ] API Logs: 列表、详情、过滤 ✅
- [ ] Operation Logs: 列表、导出 ✅

### 交互完整性
- [ ] 所有按钮有实际功能
- [ ] 所有表单有验证
- [ ] 所有删除有确认
- [ ] 所有操作有反馈（toast）

---

## Phase 2 验收标准

1. **功能完整度**: 所有页面 CRUD 操作完成度 > 90%
2. **用户流程**: Agent 创建 → 配置 → 对话流程完整可运行
3. **错误处理**: 所有操作有适当的错误提示
4. **响应式**: 移动端和桌面端均可正常使用

---

**下一步:** 进入 **Phase 3: 性能优化与数据库优化**
