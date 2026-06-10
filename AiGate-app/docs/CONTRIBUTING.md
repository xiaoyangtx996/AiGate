# 贡献指南

感谢参与 AiGate 开发。请在提交代码前阅读以下约定。

## 开发流程

1. Fork 仓库并克隆到本地
2. 从 `main` 创建功能分支，命名建议：`feat/xxx`、`fix/xxx`、`chore/xxx`
3. 在 `AiGate-app` 目录安装依赖并配置 `.env`（参考 `.env.example`）
4. 完成改动并补充/更新相关测试
5. 本地通过 lint 与测试后发起 Pull Request
6. 等待维护者 Code Review，根据反馈修改后合并

## 分支策略

- `main`：稳定分支，受 CI 保护
- 功能开发使用短期分支，合并后删除
- 紧急修复可从 `main` 拉 `hotfix/` 分支

## Commit 规范

项目采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，并通过 Husky `commit-msg` + Commitlint 校验。

格式：

```
<type>(<scope>): <subject>
```

常用 type：`feat`、`fix`、`docs`、`style`、`refactor`、`test`、`chore`、`perf`、`ci`、`revert`。

示例：

```
feat(aigate): 支持 API Key 批量导出
fix(auth): 修复 magic link 过期判断
chore(phase5): 数据库 CI、Commitlint 与 Docker 部署模板
```

说明：

- `subject` 支持中文（已关闭 subject-case 限制）
- 单行 subject 建议不超过 72 字符
- 可选 body 说明动机与破坏性变更

## 代码与测试

```bash
cd AiGate-app

# 代码检查
pnpm lint

# 单元测试
pnpm exec vitest run

# 带覆盖率
pnpm test:coverage
```

要求：

- 新功能或 Bug 修复应附带可重复的测试（如适用）
- 提交前 `lint-staged` 会自动对暂存文件执行 ESLint
- 不要提交 `.env`、构建产物（`.nuxt`、`.output`）等本地文件

## 数据库变更

- Schema 变更通过 Drizzle 迁移管理，文件位于 `app/db/migrations/`
- 本地应用迁移：`pnpm dlx drizzle-kit migrate`
- 推送到 `main` 时 GitHub Actions `database.yml` 会在 PostgreSQL 服务中校验迁移

## 文档

- 开发环境：见 [README.md](../README.md)
- API 规范：开发服务器访问 `/docs/api`，OpenAPI JSON 为 `GET /api/openapi`

## Pull Request 检查清单

- [ ] 分支基于最新 `main`
- [ ] Commit 信息符合规范
- [ ] `pnpm lint` 通过
- [ ] `pnpm exec vitest run` 通过
- [ ] 涉及 UI 的改动已在本地验证
- [ ] 已更新相关文档（如适用）
