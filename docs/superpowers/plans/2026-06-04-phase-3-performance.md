# AiGate Phase 3: 性能优化与数据库优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 数据库查询性能提升 40%+, API 响应时间降低 30%+, 前端加载速度优化 30%+

**Architecture:** 通过添加复合索引优化慢查询，通过查询重构减少 N+1 问题，通过缓存策略减少重复请求，通过代码分割降低首屏加载时间

**Tech Stack:** Drizzle ORM, Redis/Memory Cache, Nuxt Image, Vite

---

## 📋 Phase 3 任务清单（约 10 天）

### Task Group 1: 数据库索引优化（3天）

#### Task 1.1: 添加 API Log 复合索引

**Files:**
- Create: `AiGate-app/app/db/migrations/add_api_log_indexes.sql`
- Modify: `AiGate-app/drizzle.config.ts` (如果需要)

- [ ] **Step 1: 创建迁移文件**

创建 `AiGate-app/app/db/migrations/add_api_log_indexes.sql`：
```sql
-- API Log 复合索引，加速每日限额检查和组织查询
CREATE INDEX IF NOT EXISTS idx_api_log_key_date 
  ON api_log(api_key_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_log_org_date 
  ON api_log(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_log_status_date 
  ON api_log(status, created_at DESC);

-- 覆盖索引：统计查询无需回表
CREATE INDEX IF NOT EXISTS idx_api_log_stats 
  ON api_log(api_key_id, created_at) 
  INCLUDE (total_tokens, cost, status);
```

- [ ] **Step 2: 应用迁移**

Run:
```bash
cd AiGate-app
pnpm dlx drizzle-kit migrate
```

Expected: 迁移成功，无错误

- [ ] **Step 3: 验证索引**

Run SQL:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'api_log';
```

Expected: 看到新创建的索引

- [ ] **Step 4: 性能测试**

Before/after 测试查询时间：
```typescript
// 测试每日限额检查
const start = Date.now()
await checkDailyLimit('test-key-id', 1000)
const duration = Date.now() - start
console.log(`Query took ${duration}ms`)
```

Expected: 查询时间 < 10ms（之前可能 > 100ms）

- [ ] **Step 5: 提交**

```bash
git add AiGate-app/app/db/migrations/add_api_log_indexes.sql
git commit -m "perf(db): add composite indexes for api_log queries"
```

---

#### Task 1.2: Channel 表索引优化

**Files:**
- Create: `AiGate-app/app/db/migrations/add_channel_indexes.sql`

- [ ] **Step 1: 创建迁移文件**

```sql
-- Channel 渠道选择加速
CREATE INDEX IF NOT EXISTS idx_channel_status_priority 
  ON channel(status, health, priority ASC);

-- 加速模型过滤
CREATE INDEX IF NOT EXISTS idx_channel_models_gin 
  ON channel USING GIN(models);
```

- [ ] **Step 2-5: 应用、验证、测试、提交**

（类似 Task 1.1）

```bash
git commit -m "perf(db): add composite indexes for channel queries"
```

---

#### Task 1.3: 其他表索引优化

**Files:**
- Create: `AiGate-app/app/db/migrations/add_other_indexes.sql`

- [ ] **Step 1: 创建迁移文件**

```sql
-- Member 查询加速
CREATE INDEX IF NOT EXISTS idx_member_user_org 
  ON member(user_id, organization_id);

-- API Key 查询加速
CREATE INDEX IF NOT EXISTS idx_api_key_org_status 
  ON api_key(organization_id, status);

-- Agent 查询加速
CREATE INDEX IF NOT EXISTS idx_agent_org_status 
  ON agent(organization_id, status);

-- Alert 查询加速
CREATE INDEX IF NOT EXISTS idx_alert_org_read_created 
  ON alert(organization_id, read, created_at DESC);
```

- [ ] **Step 2-5: 应用、验证、测试、提交**

```bash
git commit -m "perf(db): add indexes for member, api_key, agent, alert"
```

---

### Task Group 2: Dashboard 查询优化（2天）

#### Task 2.1: 减少全表扫描

**Files:**
- Modify: `AiGate-app/server/api/aigate/dashboard/index.get.ts`

- [ ] **Step 1: 优化日志查询**

Before:
```typescript
const recentLogs = await db.select().from(apiLog).where(...)
```

After:
```typescript
const recentLogs = await db.select({
  totalTokens: apiLog.totalTokens,
  cost: apiLog.cost,
  model: apiLog.model,
  status: apiLog.status,
  createdAt: apiLog.createdAt,
}).from(apiLog).where(...) // 只查询需要的字段
```

- [ ] **Step 2: 使用聚合查询替代循环**

Replace multiple loops with single SQL aggregation:

```typescript
// Before: 3 separate loops over recentLogs
// After: single query with GROUP BY

const dailyUsage = await db.select({
  date: sql`DATE(${apiLog.createdAt})`.as('date'),
  tokens: sql<number>`SUM(COALESCE(${apiLog.totalTokens}, 0))`.as('tokens'),
  requests: sql<number>`COUNT(*)`.as('requests'),
  cost: sql<number>`SUM(COALESCE(${apiLog.cost}, 0))`.as('cost'),
})
.from(apiLog)
.where(conditions)
.groupBy(sql`DATE(${apiLog.createdAt})`)
.orderBy(sql`DATE(${apiLog.createdAt}) DESC`)
.limit(90)
```

- [ ] **Step 3: 添加查询缓存**

```typescript
// 缓存 5 分钟
const cacheKey = `dashboard:${orgId || 'all'}:${Date.now() - (Date.now() % 300000)}`

// 使用 Redis 或内存缓存
const cached = await cache.get(cacheKey)
if (cached) return cached

// ... 查询逻辑 ...

await cache.set(cacheKey, result, 300) // 5分钟 TTL
return result
```

- [ ] **Step 4: 性能测试对比**

记录优化前后的查询时间

- [ ] **Step 5: 提交**

```bash
git add AiGate-app/server/api/aigate/dashboard/index.get.ts
git commit -m "perf(dashboard): optimize queries and add caching"
```

---

### Task Group 3: 前端缓存策略（2天）

#### Task 3.1: 实现 SWR 缓存配置

**Files:**
- Modify: `AiGate-app/app/composables/api/useAigateApi.ts`
- Modify: `AiGate-app/app/composables/useRequest.ts`

- [ ] **Step 1: 配置 SWR**

```typescript
export function useAigateApi() {
  const { get, post, put, del } = useRequest()
  
  // 缓存配置
  const cacheConfig = {
    get: {
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000, // 10分钟
    },
    list: {
      staleTime: 1 * 60 * 1000, // 1分钟
      gcTime: 5 * 60 * 1000,
    },
    stats: {
      staleTime: 10 * 60 * 1000, // 10分钟
      gcTime: 30 * 60 * 1000,
    },
  }
  
  // ... 其他代码
}
```

- [ ] **Step 2: 为不同 API 设置不同的缓存策略**

```typescript
const getDashboard = () => get('/aigate/dashboard', undefined, cacheConfig.stats)
const getChannelList = (params) => get('/aigate/channel', params, cacheConfig.list)
```

- [ ] **Step 3: 实现数据预取**

```typescript
// 在页面进入前预取数据
export const useAgentsPage = () => {
  const prefetch = () => {
    $fetch('/api/aigate/agent')
  }
  
  return { prefetch }
}
```

- [ ] **Step 4: 测试缓存效果**

使用浏览器开发者工具 Network 标签验证缓存

- [ ] **Step 5: 提交**

```bash
git add AiGate-app/app/composables/api/useAigateApi.ts
git add AiGate-app/app/composables/useRequest.ts
git commit -m "perf(frontend): add SWR caching strategy"
```

---

#### Task 3.2: 图片优化

**Files:**
- Modify: 所有使用 `<img>` 的组件

- [ ] **Step 1: 替换为 Nuxt Image 组件**

```vue
<!-- Before -->
<img :src="user.avatar" />

<!-- After -->
<NuxtImg :src="user.avatar" :alt="user.name" width="64" height="64" format="webp" />
```

- [ ] **Step 2: 配置图片优化**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  image: {
    quality: 80,
    format: ['webp', 'avif'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
})
```

- [ ] **Step 3: 提交**

```bash
git commit -m "perf(images): optimize images with Nuxt Image"
```

---

### Task Group 4: API 性能优化（2天）

#### Task 4.1: 实现响应压缩

**Files:**
- Modify: `AiGate-app/nuxt.config.ts`

- [ ] **Step 1: 启用 gzip/brotli**

```typescript
export default defineNuxtConfig({
  nitro: {
    compressPublicAssets: {
      brotli: true,
      gzip: true,
    },
  },
})
```

- [ ] **Step 2: 测试压缩效果**

使用 curl 测试：
```bash
curl -H "Accept-Encoding: gzip" -I https://your-api.com/api/endpoint
```

Expected: 看到 `Content-Encoding: gzip`

- [ ] **Step 3: 提交**

```bash
git commit -m "perf(api): enable gzip and brotli compression"
```

---

#### Task 4.2: 实现分页支持

**Files:**
- Modify: `AiGate-app/server/api/aigate/api-log/index.get.ts`
- Modify: `AiGate-app/app/pages/aigate/api-logs/index.vue`

- [ ] **Step 1: 后端添加分页参数**

```typescript
const page = parseInt(query.page as string) || 1
const pageSize = parseInt(query.pageSize as string) || 20
const offset = (page - 1) * pageSize

const [data, total] = await Promise.all([
  db.select().from(apiLog).where(conditions).orderBy(desc(apiLog.createdAt)).limit(pageSize).offset(offset),
  db.select({ count: count() }).from(apiLog).where(conditions),
])

return responseSuccess({
  data,
  total: total[0].count,
  page,
  pageSize,
})
```

- [ ] **Step 2: 前端添加分页组件**

```vue
<UPagination
  v-model="page"
  :total="total"
  :page-count="pageSize"
/>
```

- [ ] **Step 3: 测试分页**

- [ ] **Step 4: 提交**

```bash
git commit -m "perf(api): add pagination for api-logs"
```

---

#### Task 4.3: API 响应时间监控

**Files:**
- Modify: `AiGate-app/server/middleware/logs.ts`

- [ ] **Step 1: 记录响应时间**

```typescript
const startTime = Date.now()

// ... 处理请求 ...

const duration = Date.now() - startTime
await db.insert(logs).values({
  ...,
  duration, // 新增字段
})
```

- [ ] **Step 2: 慢查询告警**

```typescript
if (duration > 1000) {
  console.warn(`Slow API request: ${path} took ${duration}ms`)
}
```

- [ ] **Step 3: 提交**

```bash
git commit -m "perf(monitoring): add API response time tracking"
```

---

## Phase 3 完成检查清单

### 数据库优化
- [ ] 添加了所有必要的索引
- [ ] Dashboard 查询优化完成
- [ ] N+1 查询问题已解决
- [ ] 查询缓存已实现

### 前端性能
- [ ] SWR 缓存策略已配置
- [ ] 图片已优化
- [ ] 代码分割已配置
- [ ] 首屏加载时间 < 1.5s

### API 性能
- [ ] 响应压缩已启用
- [ ] 分页已实现
- [ ] API 平均响应时间 < 200ms
- [ ] 速率限制已实现

---

## Phase 3 验收标准

1. **数据库查询性能**: 慢查询数量减少 80%
2. **API 响应时间**: P95 < 500ms，平均 < 200ms
3. **前端性能**: Lighthouse 评分 > 80
4. **缓存命中率**: SWR 缓存命中率 > 60%

---

**下一步:** 进入 **Phase 4: 测试覆盖与质量保证**
