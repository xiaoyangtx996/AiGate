# AiGate Phase 4: 测试覆盖与质量保证实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 核心功能测试覆盖率达到 60%+，建立完整的测试金字塔

**Architecture:** 采用测试金字塔策略 - 大量单元测试、适量集成测试、少量 E2E 测试，使用 Vitest + Playwright

**Tech Stack:** Vitest, Playwright, @nuxt/test-utils

---

## 📋 Phase 4 任务清单（约 10 天）

### Task Group 1: 单元测试 - API 端点（3天）

#### Task 1.1: 认证与路由策略测试

**Files:**
- Modify: `AiGate-app/server/utils/__tests__/routes.test.ts`
- Create: `AiGate-app/server/api/__tests__/auth.test.ts`

- [ ] **Step 1: 扩展现有路由测试**

Modify `AiGate-app/server/utils/__tests__/routes.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { apiRoutePolicy } from '@/server/utils/routes'

describe('API Route Policy', () => {
  describe('Admin Routes', () => {
    it('should identify admin routes', () => {
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/organization')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/api-key')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/channel')).toBe(true)
    })
    
    it('should not identify non-admin routes', () => {
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/dashboard')).toBe(false)
    })
  })
  
  describe('Public Routes', () => {
    it('should identify public routes', () => {
      expect(apiRoutePolicy.isPublicRoute('/api/auth')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/common/releases')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/gateway')).toBe(true)
    })
  })
  
  describe('Authenticated Routes', () => {
    it('should identify authenticated GET routes', () => {
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage', 'GET')).toBe(true)
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage', 'POST')).toBe(false)
    })
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `cd AiGate-app && pnpm test server/utils/__tests__/routes.test.ts`
Expected: All tests pass

- [ ] **Step 3: 提交**

```bash
git add AiGate-app/server/utils/__tests__/routes.test.ts
git commit -m "test(routes): enhance route policy tests"
```

---

#### Task 1.2: Agent API 测试

**Files:**
- Create: `AiGate-app/server/api/aigate/__tests__/agent.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

describe('Agent API', () => {
  beforeEach(async () => {
    // 清理测试数据
    await db.delete(agent)
  })
  
  it('should create an agent', async () => {
    const agentData = {
      name: 'Test Agent',
      description: 'A test agent',
      model: 'gpt-4o',
      systemPrompt: 'You are a helpful assistant',
      temperature: 30,
      maxTokens: 4096,
      tags: ['test'],
    }
    
    const response = await $fetch('/api/aigate/agent', {
      method: 'POST',
      body: agentData,
    })
    
    expect(response.success).toBe(true)
    expect(response.data.name).toBe('Test Agent')
    expect(response.data.id).toBeDefined()
  })
  
  it('should validate required fields', async () => {
    const response = await $fetch('/api/aigate/agent', {
      method: 'POST',
      body: { name: '' }, // 缺少必填字段
    }).catch(err => err)
    
    expect(response.statusCode).toBe(400)
  })
  
  it('should list agents', async () => {
    // 先创建测试数据
    await db.insert(agent).values({
      id: 'test-id',
      name: 'Test',
      description: '',
      model: 'gpt-4o',
      temperature: 30,
      maxTokens: 4096,
      tags: [],
      status: 'active',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    const response = await $fetch('/api/aigate/agent')
    expect(response.success).toBe(true)
    expect(Array.isArray(response.data)).toBe(true)
  })
  
  it('should update an agent', async () => {
    // 创建测试数据
    const [created] = await db.insert(agent).values({
      name: 'Original',
      description: '',
      model: 'gpt-4o',
      temperature: 30,
      maxTokens: 4096,
      tags: [],
      status: 'active',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()
    
    const updateData = { id: created.id, name: 'Updated' }
    const response = await $fetch(`/api/aigate/agent/${created.id}`, {
      method: 'PUT',
      body: updateData,
    })
    
    expect(response.success).toBe(true)
    expect(response.data.name).toBe('Updated')
  })
  
  it('should delete an agent', async () => {
    const [created] = await db.insert(agent).values({
      name: 'To Delete',
      description: '',
      model: 'gpt-4o',
      temperature: 30,
      maxTokens: 4096,
      tags: [],
      status: 'active',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()
    
    const response = await $fetch(`/api/aigate/agent/${created.id}`, {
      method: 'DELETE',
    })
    
    expect(response.success).toBe(true)
    
    // 验证已删除
    const remaining = await db.select().from(agent).where(eq(agent.id, created.id))
    expect(remaining).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试**

```bash
pnpm test server/api/aigate/__tests__/agent.test.ts
```

- [ ] **Step 3: 为其他核心 API 创建类似测试**

- Channel API
- API Key API
- Organization API

- [ ] **Step 4: 提交**

```bash
git commit -m "test(api): add comprehensive agent API tests"
```

---

#### Task 1.3: Gateway 和工具函数测试

**Files:**
- Modify: `AiGate-app/server/utils/__tests__/gateway.test.ts` (已完成部分)
- Create: `AiGate-app/server/utils/__tests__/alerts.test.ts`

- [ ] **Step 1: 补全 Gateway 测试**

```typescript
describe('Gateway Utils', () => {
  it('should select healthy channel', async () => {
    const channel = await selectChannel('gpt-4o')
    expect(channel).toBeDefined()
    expect(channel.health).toBe('healthy')
  })
  
  it('should validate API key', async () => {
    const key = await validateApiKeyFromHeader('Bearer valid-key')
    expect(key).toBeDefined()
    expect(key.status).toBe('active')
  })
  
  it('should reject invalid API key', async () => {
    const key = await validateApiKeyFromHeader('Bearer invalid-key')
    expect(key).toBeNull()
  })
  
  it('should check IP whitelist', async () => {
    expect(checkIpWhitelist({ ipWhitelist: [] }, '192.168.1.1')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.1'] }, '192.168.1.1')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.1'] }, '10.0.0.1')).toBe(false)
  })
  
  it('should enforce daily limits', async () => {
    const result = await checkDailyLimit('key-id', 10)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(10)
  })
})
```

- [ ] **Step 2: 创建 Alerts 测试**

```typescript
describe('Alerts Utils', () => {
  it('should generate quota alerts for high usage', async () => {
    // Mock 组织数据
    // 执行告警检查
    // 验证告警已创建
  })
  
  it('should generate key expiry alerts', async () => {
    // Mock 即将过期的密钥
    // 执行告警检查
    // 验证告警已创建
  })
})
```

- [ ] **Step 3: 运行所有工具函数测试**

```bash
pnpm test server/utils/__tests__/
```

- [ ] **Step 4: 提交**

```bash
git commit -m "test(utils): add comprehensive gateway and alerts tests"
```

---

### Task Group 2: 前端组件测试（2天）

#### Task 2.1: 核心组件测试

**Files:**
- Create: `AiGate-app/app/components/__tests__/forms.test.ts`
- Create: `AiGate-app/app/components/__tests__/tables.test.ts`

- [ ] **Step 1: 测试表单组件**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { UInput, UButton } from '@nuxt/ui'

describe('Form Components', () => {
  it('should validate required input', async () => {
    const wrapper = mount(YourFormComponent)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('required')
  })
  
  it('should submit valid data', async () => {
    // 测试表单提交
  })
})
```

- [ ] **Step 2: 测试表格组件**

```typescript
describe('Table Components', () => {
  it('should display data correctly', () => {
    // 测试数据展示
  })
  
  it('should handle pagination', async () => {
    // 测试分页
  })
  
  it('should handle sorting', async () => {
    // 测试排序
  })
})
```

- [ ] **Step 3: 运行测试**

- [ ] **Step 4: 提交**

```bash
git commit -m "test(components): add form and table component tests"
```

---

### Task Group 3: E2E 测试（3天）

#### Task 3.1: 用户认证流程

**Files:**
- Create: `AiGate-app/e2e/auth.spec.ts`

- [ ] **Step 1: 配置 Playwright**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 2: 编写登录测试**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/auth/sign-in')
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/aigate/dashboard')
  })
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/sign-in')
    
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.error-message')).toBeVisible()
  })
  
  test('should logout successfully', async ({ page }) => {
    // 先登录
    // 然后登出
    // 验证跳转到登录页
  })
})
```

- [ ] **Step 3: 运行 E2E 测试**

```bash
pnpm exec playwright test auth.spec.ts
```

- [ ] **Step 4: 提交**

```bash
git add playwright.config.ts
git add e2e/auth.spec.ts
git commit -m "test(e2e): add authentication flow tests"
```

---

#### Task 3.2: Agent 创建和对话流程

**Files:**
- Create: `AiGate-app/e2e/agents.spec.ts`

- [ ] **Step 1: 编写测试**

```typescript
test.describe('Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
  })
  
  test('should create a new agent', async ({ page }) => {
    await page.goto('/aigate/agents/create')
    
    await page.fill('input[placeholder*="name"]', 'Test Agent')
    await page.fill('textarea[placeholder*="description"]', 'A test agent')
    await page.click('button:has-text("Save")')
    
    await expect(page).toHaveURL('/aigate/agents')
    await expect(page.locator('text=Test Agent')).toBeVisible()
  })
  
  test('should chat with agent', async ({ page }) => {
    // 创建 agent
    // 进入对话页面
    // 发送消息
    // 验证回复
  })
})
```

- [ ] **Step 2-4: 运行、修复、提交**

```bash
git commit -m "test(e2e): add agent management flow tests"
```

---

#### Task 3.3: Channel 配置流程

**Files:**
- Create: `AiGate-app/e2e/channels.spec.ts`

（类似 Task 3.2 的结构）

- [ ] **Step 1-4: 编写、运行、修复、提交**

```bash
git commit -m "test(e2e): add channel configuration flow tests"
```

---

### Task Group 4: 测试基础设施（1天）

#### Task 4.1: 配置测试覆盖率报告

**Files:**
- Modify: `AiGate-app/vitest.config.ts`
- Modify: `AiGate-app/package.json`

- [ ] **Step 1: 配置覆盖率**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
})
```

- [ ] **Step 2: 添加测试脚本**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 3: 运行覆盖率报告**

```bash
pnpm test:coverage
```

- [ ] **Step 4: 提交**

```bash
git commit -m "test(infra): configure coverage reporting"
```

---

#### Task 4.2: 配置 CI 测试门禁

**Files:**
- Create: `AiGate-app/.github/workflows/test.yml`

- [ ] **Step 1: 创建 GitHub Actions**

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: aigate_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/aigate_test
      
      - name: Run E2E tests
        run: pnpm exec playwright test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/aigate_test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

- [ ] **Step 2: 提交**

```bash
git commit -m "test(ci): configure GitHub Actions test workflow"
```

---

## Phase 4 完成检查清单

### 单元测试
- [ ] API 端点测试覆盖率 > 70%
- [ ] 工具函数测试覆盖率 > 80%
- [ ] 所有核心业务逻辑有测试

### E2E 测试
- [ ] 用户认证流程测试
- [ ] Agent 管理流程测试
- [ ] Channel 配置流程测试

### 测试基础设施
- [ ] 测试覆盖率报告可生成
- [ ] CI 自动运行测试
- [ ] 测试覆盖率门禁已配置

---

## Phase 4 验收标准

1. **测试覆盖率**: 整体覆盖率 > 60%
2. **CI 集成**: 所有 PR 必须通过测试
3. **测试通过率**: 100%（无 flaky tests）
4. **测试文档**: 有 README 说明如何运行测试

---

**下一步:** 进入 **Phase 5: 工程化与 DevOps**
