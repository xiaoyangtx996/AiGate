# AiGate Phase 1: 安全加固与类型安全基础实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除所有安全漏洞，建立 TypeScript strict 类型安全基础

**Architecture:** 通过全局错误处理中间件统一错误格式，通过类型定义文件建立类型系统，通过输入验证 schema 防止注入攻击

**Tech Stack:** TypeScript, Zod, Drizzle ORM, Nuxt 4

---

## 📋 Phase 1 任务清单（约 10 天）

### Task 1: 环境变量安全修复

**Files:**
- Modify: `AiGate-app/.env.example:2`

- [ ] **Step 1: 修复硬编码密码**

Edit `.env.example` 第 2 行：
```diff
- DATABASE_URL=postgresql://postgres:password@localhost:5432/AiGate
+ DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/AiGate
```

- [ ] **Step 2: 添加安全警告注释**

在文件开头添加：
```markdown
# ⚠️ 安全警告
# 1. 复制此文件为 .env 后，请立即修改所有默认密码
# 2. 切勿将 .env 文件提交到版本控制
# 3. 生产环境必须使用强密码和加密连接
```

- [ ] **Step 3: 验证更改**

Run: `cat AiGate-app/.env.example`
Expected: 显示更新后的内容，无硬编码密码

- [ ] **Step 4: Commit**

```bash
git add AiGate-app/.env.example
git commit -m "security: remove hardcoded password from .env.example"
```

---

### Task 2: 创建核心类型定义

**Files:**
- Create: `AiGate-app/app/types/api.ts`
- Modify: `AiGate-app/app/composables/api/useAigateApi.ts:1`

- [ ] **Step 1: 创建 API 类型定义文件**

创建 `AiGate-app/app/types/api.ts`：
```typescript
/**
 * 通用 API 响应类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * 通用错误类型
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * 请求选项扩展
 */
export interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
}
```

- [ ] **Step 2: 验证类型文件**

Run: `npx tsc --noEmit AiGate-app/app/types/api.ts`
Expected: 无编译错误

- [ ] **Step 3: Commit**

```bash
git add AiGate-app/app/types/api.ts
git commit -m "feat: add core API type definitions"
```

---

### Task 3: 创建全局错误处理中间件

**Files:**
- Create: `AiGate-app/server/middleware/error-handler.ts`
- Modify: `AiGate-app/nuxt.config.ts`

- [ ] **Step 1: 创建错误处理中间件**

创建 `AiGate-app/server/middleware/error-handler.ts`：
```typescript
/**
 * 全局错误处理中间件
 */
export default defineEventHandler((event) => {
  try {
    return
  }
  catch (error) {
    const { $logger } = event.context as any
    
    // 记录错误日志（脱敏）
    $logger?.error('API Error:', {
      path: event.node.req.url,
      method: event.method,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        // 生产环境不输出堆栈
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      } : error,
    })

    // 统一错误响应格式
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : (error.message || 'Something went wrong')

    return {
      success: false,
      code: statusCode,
      message,
      ...(process.env.NODE_ENV === 'development' && error.stack
        ? { stack: error.stack }
        : {}),
    }
  }
})
```

- [ ] **Step 2: 在 nuxt.config.ts 中注册中间件**

Edit `AiGate-app/nuxt.config.ts`：
```typescript
export default defineNuxtConfig({
  // ... 其他配置
  nitro: {
    rollupConfig: {
      plugins: [vue()],
    },
    middleware: [
      '~/server/middleware/error-handler.ts',
    ],
  },
})
```

- [ ] **Step 3: 测试错误处理**

创建一个测试端点验证中间件：
```typescript
// 临时测试文件，后续会删除
throw new Error('Test error')
```

Run: `pnpm dev` 并访问该端点
Expected: 返回统一格式的错误响应

- [ ] **Step 4: 删除测试文件并 Commit**

```bash
git add AiGate-app/server/middleware/error-handler.ts
git add AiGate-app/nuxt.config.ts
git commit -m "feat: add global error handler middleware"
```

---

### Task 4: 添加输入验证 Schema

**Files:**
- Modify: `AiGate-app/server/api/aigate/agent/index.post.ts`
- Modify: `AiGate-app/server/api/aigate/channel/index.post.ts`
- Create: `AiGate-app/server/utils/validation.ts`

- [ ] **Step 1: 创建验证工具函数**

创建 `AiGate-app/server/utils/validation.ts`：
```typescript
import { z } from 'zod'

/**
 * 验证失败错误类
 */
export class ValidationError extends Error {
  constructor(
    public issues: z.ZodIssue[]
  ) {
    super('Validation failed')
    this.name = 'ValidationError'
  }
}

/**
 * 验证请求体
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return defineEventHandler(async (event) => {
    const body = await readBody(event)
    const result = schema.safeParse(body)
    
    if (!result.success) {
      throw new ValidationError(result.error.issues)
    }
    
    return result.data
  })
}

/**
 * 验证查询参数
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return defineEventHandler(async (event) => {
    const query = getQuery(event)
    const result = schema.safeParse(query)
    
    if (!result.success) {
      throw new ValidationError(result.error.issues)
    }
    
    return result.data
  })
}
```

- [ ] **Step 2: 为 Agent 创建验证**

Modify `AiGate-app/server/api/aigate/agent/index.post.ts`：
```typescript
import { insertAgentSchema } from '@/db/schema'
import { validateBody } from '@/server/utils/validation'

export default validateBody(insertAgentSchema) .use(async (event) => {
  const body = event.context.body as any
  const principal = event.context.principal as { organizationId?: string } | undefined

  const [res] = await db.insert(agent).values({
    ...body,
    ...(principal?.organizationId && !body.organizationId ? { organizationId: principal.organizationId } : {}),
  }).returning()

  return responseSuccess(res)
})
```

- [ ] **Step 3: 为 Channel 创建验证**

Similar modification for channel creation

- [ ] **Step 4: 测试验证**

Run: `pnpm dev`
Test with invalid data to ensure validation works

- [ ] **Step 5: Commit**

```bash
git add AiGate-app/server/utils/validation.ts
git add AiGate-app/server/api/aigate/agent/index.post.ts
git add AiGate-app/server/api/aigate/channel/index.post.ts
git commit -m "feat: add input validation with Zod schemas"
```

---

### Task 5: 修复 CIDR 匹配漏洞

**Files:**
- Modify: `AiGate-app/server/utils/gateway.ts:45-50`

- [ ] **Step 1: 添加边界检查**

Replace `matchCidr` and `ipToNum` functions:
```typescript
function matchCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split('/')
  if (parts.length !== 2) {
    throw new Error('Invalid CIDR format')
  }
  
  const [range, bitsStr] = parts
  const bits = parseInt(bitsStr, 10)
  
  // 验证 bits 范围 (0-32)
  if (isNaN(bits) || bits < 0 || bits > 32) {
    throw new Error('Invalid CIDR prefix length')
  }
  
  // 验证 IP 格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipRegex.test(ip) || !ipRegex.test(range)) {
    throw new Error('Invalid IP address format')
  }
  
  const mask = bits === 0 ? 0 : ~(2 ** (32 - bits) - 1) >>> 0
  const ipNum = ipToNum(ip)
  const rangeNum = ipToNum(range)
  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip: string): number {
  const octets = ip.split('.')
  if (octets.length !== 4) {
    throw new Error('Invalid IP address')
  }
  
  return octets.reduce((acc, octet) => {
    const num = parseInt(octet, 10)
    if (isNaN(num) || num < 0 || num > 255) {
      throw new Error('Invalid IP octet')
    }
    return (acc << 8) + num
  }, 0) >>> 0
}
```

- [ ] **Step 2: 添加测试用例**

Add to `AiGate-app/server/utils/__tests__/gateway.test.ts`:
```typescript
it('should reject invalid CIDR prefix', () => {
  expect(() => matchCidr('192.168.1.1', '192.168.1.0/33')).toThrow('Invalid CIDR prefix length')
})

it('should reject invalid IP format', () => {
  expect(() => ipToNum('256.1.1.1')).toThrow('Invalid IP octet')
})

it('should handle /0 CIDR', () => {
  expect(matchCidr('1.2.3.4', '0.0.0.0/0')).toBe(true)
})

it('should handle /32 CIDR', () => {
  expect(matchCidr('192.168.1.1', '192.168.1.1/32')).toBe(true)
})
```

- [ ] **Step 3: 运行测试**

Run: `cd AiGate-app && pnpm test server/utils/__tests__/gateway.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add AiGate-app/server/utils/gateway.ts
git add AiGate-app/server/utils/__tests__/gateway.test.ts
git commit -m "fix: add bounds checking to CIDR matching"
```

---

### Task 6: 实现日志脱敏

**Files:**
- Modify: `AiGate-app/server/middleware/logs.ts`
- Modify: `AiGate-app/server/utils/alert-notify.ts`

- [ ] **Step 1: 创建脱敏工具函数**

Add to `AiGate-app/server/utils/logs.ts` (create if not exists):
```typescript
/**
 * 脱敏敏感信息
 */
export function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
  ]
  
  const sanitized = { ...data }
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***'
    }
  }
  
  return sanitized
}

/**
 * 脱敏请求头
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitiveHeaders = [
    'authorization',
    'x-api-key',
    'cookie',
    'set-cookie',
  ]
  
  const sanitized: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***'
    }
    else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}
```

- [ ] **Step 2: 修改日志中间件使用脱敏**

Modify `AiGate-app/server/middleware/logs.ts`:
```typescript
import { sanitizeLogData, sanitizeHeaders } from '@/server/utils/logs'

// ... 在记录日志时
const logData = {
  userId: principal.userId,
  ip,
  action: path,
  method,
  params: sanitizeLogData(body ?? {}), // 脱敏参数
  device: device.type ?? 'desktop',
  os: os.name ? `${os.name} ${os.version || ''}`.trim() : '未知',
  browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : '未知',
}
```

- [ ] **Step 3: 移除 console.log 语句**

Remove all `console.log` from `alert-notify.ts`

- [ ] **Step 4: 测试验证**

Run: `pnpm dev`
Trigger a log event and check logs

- [ ] **Step 5: Commit**

```bash
git add AiGate-app/server/utils/logs.ts
git add AiGate-app/server/middleware/logs.ts
git add AiGate-app/server/utils/alert-notify.ts
git commit -m "feat: add log sanitization for sensitive data"
```

---

### Task 7: 启用 TypeScript Strict 模式

**Files:**
- Modify: `AiGate-app/tsconfig.json`
- Modify: `AiGate-app/.nuxt/tsconfig.*.json` (generated)

- [ ] **Step 1: 更新 tsconfig.json**

Edit `AiGate-app/tsconfig.json`:
```json
{
  "extends": "./.nuxt/tsconfig.app.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

- [ ] **Step 2: 准备修复类型错误**

Run: `cd AiGate-app && pnpm build 2>&1 | tee /tmp/ts-errors.log`
Expected: 收集所有类型错误

- [ ] **Step 3: 修复最常见的类型错误**

从以下类别修复（优先级）：
1. `any` → 具体类型
2. 隐式 `any` → 添加类型注解
3. 类型不匹配 → 修正类型

示例修复（composables/api/useAigateApi.ts）：
```typescript
// 之前
const post = <T = unknown, B extends Record<string, any> = Record<string, any>>(
  url: string,
  body?: B,
  ...
)

// 之后
const post = <T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
  url: string,
  body?: B,
  ...
)
```

- [ ] **Step 4: 验证修复**

Run: `pnpm build`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add AiGate-app/tsconfig.json
# git add 所有修改的 .ts 和 .vue 文件
git commit -m "feat: enable TypeScript strict mode"
```

---

### Task 8: 实现 API 速率限制

**Files:**
- Modify: `AiGate-app/server/utils/rate-limit.ts`
- Modify: `AiGate-app/server/api/gateway/[...path].ts`

- [ ] **Step 1: 增强速率限制实现**

Modify `AiGate-app/server/utils/rate-limit.ts`:
```typescript
interface RateLimitEntry {
  count: number
  resetTime: number
  windowMs: number
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>()
  
  /**
   * 检查速率限制
   */
  check(key: string, limit: number = 100, windowMs: number = 60000): {
    allowed: boolean
    remaining: number
    resetIn: number
  } {
    const now = Date.now()
    const entry = this.requests.get(key)
    
    if (!entry || now > entry.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + windowMs, windowMs })
      return { allowed: true, remaining: limit - 1, resetIn: windowMs }
    }
    
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetIn: entry.resetTime - now }
    }
    
    entry.count++
    return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetTime - now }
  }
  
  /**
   * 清理过期记录
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}

// 单例实例
export const rateLimiter = new RateLimiter()

// 定期清理（每小时）
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000)
}
```

- [ ] **Step 2: 在 Gateway 中应用速率限制**

Modify `AiGate-app/server/api/gateway/[...path].ts`:
```typescript
import { rateLimiter } from '@/server/utils/rate-limit'

export default defineEventHandler(async (event) => {
  // 获取 API Key
  const authHeader = getRequestHeader(event, 'authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  
  if (!apiKey) {
    return responseError(new Error('Missing API Key'), 401)
  }
  
  // 检查速率限制
  const rateLimit = rateLimiter.check(apiKey, 100, 60000) // 100次/分钟
  
  if (!rateLimit.allowed) {
    setResponseHeaders(event, {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(rateLimit.resetIn),
      'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
    })
    return responseError(new Error('Rate limit exceeded'), 429)
  }
  
  // 设置速率限制头
  setResponseHeaders(event, {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetIn),
  })
  
  // ... 原有逻辑
})
```

- [ ] **Step 3: 添加测试**

Create `AiGate-app/server/utils/__tests__/rate-limit-enhanced.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { rateLimiter } from '@/server/utils/rate-limit'

describe('RateLimiter', () => {
  it('should allow requests under limit', () => {
    const result = rateLimiter.check('test-key', 3, 60000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })
  
  it('should block requests over limit', () => {
    rateLimiter.check('test-key-2', 2, 60000)
    rateLimiter.check('test-key-2', 2, 60000)
    const result = rateLimiter.check('test-key-2', 2, 60000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `cd AiGate-app && pnpm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add AiGate-app/server/utils/rate-limit.ts
git add AiGate-app/server/api/gateway/[...path].ts
git add AiGate-app/server/utils/__tests__/rate-limit-enhanced.test.ts
git commit -m "feat: implement enhanced rate limiting with cleanup"
```

---

## Phase 1 完成检查清单

- [ ] **安全漏洞已修复**
  - [ ] 环境变量无硬编码
  - [ ] 全局错误处理已实现
  - [ ] 输入验证已添加
  - [ ] CIDR 漏洞已修复
  - [ ] 日志脱敏已完成

- [ ] **类型安全基础已建立**
  - [ ] API 类型定义已创建
  - [ ] TypeScript strict 已启用
  - [ ] 核心文件类型错误已修复

- [ ] **测试通过**
  - [ ] CIDR 边界测试通过
  - [ ] 速率限制测试通过
  - [ ] 构建无错误

---

## Phase 1 验收标准

1. **安全扫描**: `pnpm audit` 无高危漏洞
2. **类型检查**: `pnpm build` 无 TypeScript 错误
3. **测试覆盖**: Phase 1 新增功能测试覆盖率 100%
4. **文档**: 类型定义有 JSDoc 注释

---

**下一步:** 执行此计划后，进入 **Phase 2: 核心功能补全**
