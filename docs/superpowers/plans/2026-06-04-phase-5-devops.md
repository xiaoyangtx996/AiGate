# AiGate Phase 5: 工程化与 DevOps 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立完整的 CI/CD 流程、代码质量门禁、文档体系和监控体系

**Architecture:** 采用 GitHub Actions 实现自动化流水线，通过 ESLint + Husky 保证代码质量，通过 OpenAPI + 文档站点提供完整文档

**Tech Stack:** GitHub Actions, Husky, ESLint, Swagger/OpenAPI, Sentry

---

## 📋 Phase 5 任务清单（约 10 天）

### Task Group 1: CI/CD 流程（2天）

#### Task 1.1: 完善 GitHub Actions 工作流

**Files:**
- Modify: `AiGate-app/.github/workflows/test.yml` (Phase 4 创建)
- Create: `AiGate-app/.github/workflows/build.yml`
- Create: `AiGate-app/.github/workflows/deploy.yml`
- Create: `AiGate-app/.github/workflows/database.yml`

- [ ] **Step 1: 创建构建工作流**

创建 `AiGate-app/.github/workflows/build.yml`:
```yaml
name: Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
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
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/aigate_test
      
      - name: Type check
        run: pnpm build
      
      - name: Run linter
        run: pnpm lint
      
      - name: Build application
        run: pnpm build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/aigate_test
          BETTER_AUTH_SECRET: test-secret-key
          BETTER_AUTH_URL: http://localhost:3000
          NUXT_APP_NAME: AiGate Test
          NUXT_APP_DESC: Test
      
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .output
```

- [ ] **Step 2: 创建部署工作流**

创建 `AiGate-app/.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # 添加实际的部署命令
          # 例如: vercel --prod, pm2 deploy, docker-compose up
```

- [ ] **Step 3: 创建数据库迁移工作流**

创建 `AiGate-app/.github/workflows/database.yml`:
```yaml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'app/db/**'
      - 'drizzle.config.ts'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Generate migration
        run: pnpm dlx drizzle-kit generate
      
      - name: Create migration PR
        run: |
          # 自动创建 migration PR
```

- [ ] **Step 4: 测试工作流**

```bash
git push origin test-workflows
```

在 GitHub 上验证工作流运行

- [ ] **Step 5: 提交**

```bash
git commit -m "ci: add comprehensive GitHub Actions workflows"
```

---

#### Task 1.2: 配置环境变量管理

**Files:**
- Create: `AiGate-app/.github/workflows/secrets-sync.yml`

- [ ] **Step 1: 配置 GitHub Secrets**

在 GitHub 仓库设置中添加：
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `NUXT_RESEND_API_KEY`
- `GITHUB_TOKEN`
- 等所有需要的 secrets

- [ ] **Step 2: 创建 Secrets 检查工作流**

验证所有必需的 secrets 已配置

- [ ] **Step 3: 提交**

```bash
git commit -m "ci: configure secrets management"
```

---

### Task Group 2: 代码质量工具（2天）

#### Task 2.1: ESLint 规则增强

**Files:**
- Modify: `AiGate-app/eslint.config.mjs`

- [ ] **Step 1: 添加 stricter rules**

```typescript
import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  stylistic: true,
  tailwindcss: true,
  rules: {
    'n/prefer-global/process': 'off',
    
    // TypeScript 严格规则
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    
    // Vue 规则
    'vue/require-default-prop': 'error',
    'vue/require-prop-types': 'error',
    'vue/no-unused-vars': 'error',
    
    // 代码质量
    'no-console': ['warn', { 
      allow: ['warn', 'error', 'info'] 
    }],
    'no-debugger': 'error',
  },
})
```

- [ ] **Step 2: 运行 ESLint 修复**

```bash
cd AiGate-app
pnpm lint:fix
```

- [ ] **Step 3: 在 CI 中添加 Lint 检查**

Modify test.yml:
```yaml
- name: Run linter
  run: pnpm lint
```

- [ ] **Step 4: 提交**

```bash
git commit -m "chore(eslint): enhance linting rules"
```

---

#### Task 2.2: Pre-commit Hooks

**Files:**
- Modify: `AiGate-app/.husky/pre-commit`
- Modify: `AiGate-app/package.json`

- [ ] **Step 1: 配置 Husky**

```bash
cd AiGate-app
pnpm prepare
```

- [ ] **Step 2: 配置 pre-commit hook**

Edit `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

- [ ] **Step 3: 配置 lint-staged**

Add to `package.json`:
```json
{
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

- [ ] **Step 4: 安装 prettier**

```bash
pnpm add -D prettier
```

创建 `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all"
}
```

- [ ] **Step 5: 测试 pre-commit**

```bash
git add .
git commit -m "test: pre-commit hooks"
```

验证是否自动运行 lint 和 format

- [ ] **Step 6: 提交**

```bash
git commit -m "chore: configure pre-commit hooks with lint-staged"
```

---

#### Task 2.3: Commit Message 规范

**Files:**
- Modify: `AiGate-app/commitlint.config.cjs`
- Modify: `AiGate-app/.husky/commit-msg`

- [ ] **Step 1: 配置 Commitlint**

Edit `commitlint.config.cjs`:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // Bug 修复
        'docs',     // 文档
        'style',    // 格式
        'refactor', // 重构
        'test',     // 测试
        'chore',    // 构建/工具
        'perf',     // 性能优化
        'ci',       // CI/CD
        'revert',   // 回滚
      ],
    ],
    'subject-case': [0], // 允许任意大小写
  },
}
```

- [ ] **Step 2: 配置 commit-msg hook**

```bash
cd AiGate-app
echo 'npx --no -- commitlint --edit $1' > .husky/commit-msg
chmod +x .husky/commit-msg
```

- [ ] **Step 3: 测试**

```bash
git commit -m "invalid message"
# Expected: commitlint 拒绝

git commit -m "feat: valid message"
# Expected: commit 成功
```

- [ ] **Step 4: 提交**

```bash
git commit -m "chore: configure commitlint with conventional commits"
```

---

### Task Group 3: 文档建设（3天）

#### Task 3.1: API 文档 (OpenAPI/Swagger)

**Files:**
- Create: `AiGate-app/openapi.json`
- Modify: `AiGate-app/nuxt.config.ts`

- [ ] **Step 1: 安装 swagger 模块**

```bash
cd AiGate-app
pnpm add -D @nuxtjs/swagger
```

- [ ] **Step 2: 配置 Swagger**

Add to `nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  modules: [
    // ... 其他 modules
    '@nuxtjs/swagger',
  ],
  
  swagger: {
    swaggerDefinition: {
      info: {
        title: 'AiGate API',
        description: 'Enterprise AI Management Platform API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:5173/api',
          description: 'Development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    route: '/api-docs',
  },
})
```

- [ ] **Step 3: 为 API 端点添加文档注释**

在 API 文件中添加 JSDoc：
```typescript
/**
 * @openapi
 * /api/aigate/agent:
 *   get:
 *     tags:
 *       - Agent
 *     summary: List all agents
 *     description: Returns a list of all agents
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 */
export default defineEventHandler(async (event) => {
  // ...
})
```

- [ ] **Step 4: 启动并验证**

Run: `pnpm dev`
Navigate to `/api-docs`
Expected: 看到 Swagger UI

- [ ] **Step 5: 提交**

```bash
git add AiGate-app/nuxt.config.ts
git add AiGate-app/server/api/aigate/agent/index.get.ts
git commit -m "docs(api): add OpenAPI documentation"
```

---

#### Task 3.2: 开发者文档

**Files:**
- Create: `docs/DEVELOPMENT.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/CONTRIBUTING.md`

- [ ] **Step 1: 创建开发文档**

创建 `docs/DEVELOPMENT.md`:
```markdown
# Development Guide

## Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Drizzle ORM

## Setup
1. Clone repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env`
4. Configure environment variables
5. Run migrations: `pnpm dlx drizzle-kit migrate`
6. Start dev server: `pnpm dev`

## Project Structure
- `app/` - Nuxt frontend
- `server/` - Nuxt server (API)
- `shared/` - Shared types
- `docs/` - Documentation

## Common Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm lint` - Run linter
- `pnpm type-check` - TypeScript check
```

- [ ] **Step 2: 创建架构文档**

创建 `docs/ARCHITECTURE.md`:
```markdown
# Architecture

## Tech Stack
- Frontend: Nuxt 4, Vue 3, TypeScript, Tailwind CSS
- Backend: Nuxt Nitro, Drizzle ORM
- Database: PostgreSQL
- Auth: Better Auth

## Key Patterns
- Repository pattern for data access
- Composable pattern for reusable logic
- Middleware for auth and logging

## Database Schema
[Include ER diagram or description]
```

- [ ] **Step 3: 创建贡献指南**

创建 `docs/CONTRIBUTING.md`:
```markdown
# Contributing

## Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a PR

## Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/)

## Code Review
All PRs require review from maintainers.
```

- [ ] **Step 4: 提交**

```bash
git add docs/
git commit -m "docs: add developer documentation"
```

---

### Task Group 4: 监控与可观测性（2天）

#### Task 4.1: Sentry 错误监控

**Files:**
- Modify: `AiGate-app/nuxt.config.ts`
- Create: `AiGate-app/app/plugins/sentry.client.ts`
- Create: `AiGate-app/server/plugins/sentry.server.ts`

- [ ] **Step 1: 安装 Sentry**

```bash
cd AiGate-app
pnpm add @sentry/nuxt @sentry/vite-plugin -D
```

- [ ] **Step 2: 配置 Sentry**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/api/**': { cors: true },
  },
  
  vite: {
    plugins: [
      sentryVitePlugin({
        org: 'your-org',
        project: 'aigate',
      }),
    ],
  },
})
```

- [ ] **Step 3: 添加客户端插件**

创建 `app/plugins/sentry.client.ts`:
```typescript
export default defineNuxtPlugin(() => {
  if (process.env.NODE_ENV === 'production') {
    const Sentry = require('@sentry/nuxt')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    })
  }
})
```

- [ ] **Step 4: 提交**

```bash
git commit -m "chore(monitoring): add Sentry error tracking"
```

---

#### Task 4.2: 业务指标监控

**Files:**
- Create: `AiGate-app/server/utils/metrics.ts`

- [ ] **Step 1: 实现指标收集**

```typescript
/**
 * 业务指标收集
 */
export class MetricsCollector {
  private counters = new Map<string, number>()
  private histograms = new Map<string, number[]>()
  
  /**
   * 记录计数器
   */
  increment(name: string, tags?: Record<string, string>) {
    const key = this.makeKey(name, tags)
    this.counters.set(key, (this.counters.get(key) || 0) + 1)
  }
  
  /**
   * 记录直方图（延迟等）
   */
  record(name: string, value: number, tags?: Record<string, string>) {
    const key = this.makeKey(name, tags)
    if (!this.histograms.has(key)) {
      this.histograms.set(key, [])
    }
    this.histograms.get(key)!.push(value)
  }
  
  /**
   * 生成报告
   */
  report() {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
          },
        ])
      ),
    }
  }
}

export const metrics = new MetricsCollector()
```

- [ ] **Step 2: 在关键路径记录指标**

- [ ] **Step 3: 暴露指标端点**

```typescript
// /api/metrics
export default defineEventHandler(() => {
  return metrics.report()
})
```

- [ ] **Step 4: 提交**

```bash
git commit -m "chore(monitoring): add business metrics collector"
```

---

### Task Group 3: 代码质量门禁（1天）

#### Task 3.1: PR 模板和检查清单

**Files:**
- Create: `AiGate-app/.github/pull_request_template.md`
- Create: `AiGate-app/.github/CODEOWNERS`

- [ ] **Step 1: 创建 PR 模板**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Screenshots (if applicable)
```

- [ ] **Step 2: 配置 CODEOWNERS**

```
*                    @baiwumm
*.ts                 @baiwumm
*.vue                @baiwumm
server/**            @baiwumm
app/**               @baiwumm
```

- [ ] **Step 3: 提交**

```bash
git commit -m "chore: add PR template and CODEOWNERS"
```

---

## Phase 5 完成检查清单

### CI/CD
- [ ] GitHub Actions 工作流已配置
- [ ] 测试、构建、部署自动化
- [ ] 环境变量安全管理

### 代码质量
- [ ] ESLint 规则已增强
- [ ] Pre-commit hooks 已配置
- [ ] Commit message 规范已实施
- [ ] PR 模板已创建

### 文档
- [ ] API 文档已生成（Swagger）
- [ ] 开发者文档已完成
- [ ] 贡献指南已创建

### 监控
- [ ] Sentry 错误监控已集成
- [ ] 业务指标监控已实现
- [ ] 性能监控已配置

---

## Phase 5 验收标准

1. **CI/CD**: 所有 PR 自动运行测试和构建
2. **代码质量**: ESLint 零错误
3. **文档覆盖**: 所有 API 有文档
4. **监控覆盖**: 错误捕获率 > 95%

---

**下一步:** 进入 **Phase 6: 用户体验优化**
