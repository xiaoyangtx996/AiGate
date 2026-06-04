# 计划执行指南

## 📋 计划概览

AiGate 全面优化计划已制定完成，包含 6 个阶段，总计 12 周，150+ 个子任务。

**文档位置**: `docs/superpowers/`

---

## 🚀 执行方式

按照 **superpowers** 工作流，计划制定完成后有两种执行方式：

### 选项 1: Subagent-Driven 执行（推荐）

**特点**:
- 为每个任务派发独立的 subagent
- 任务之间自动并行
- 每完成一个任务自动 review
- 快速迭代，适合大规模重构

**使用方式**:
```
Invoke subagent-driven-development skill
```

**适合场景**:
- 大量独立任务
- 需要快速推进
- 愿意承担更多 token 消耗

---

### 选项 2: Inline Execution

**特点**:
- 在当前会话顺序执行任务
- 每完成一个阶段暂停并 review
- 更可控，节省 token

**使用方式**:
```
Invoke executing-plans skill
```

**适合场景**:
- 少量关键任务
- 需要精细控制
- Token 预算有限

---

## 📅 推荐执行顺序

### 🎯 阶段执行顺序

**建议严格按顺序执行**，因为每个阶段依赖前一阶段：

```
Phase 1 (2周) → Phase 2 (3周) → Phase 3 (2周) → Phase 4 (2周) → Phase 5 (2周) → Phase 6 (1周)
```

**理由**:
- **Phase 1** 必须先完成：安全漏洞和类型安全是所有后续开发的基础
- **Phase 2** 其次：功能完整度直接影响用户体验
- **Phase 3-6** 可以在 Phase 2 完成后并行启动部分工作

### 🔄 并行执行策略

如果想加速，可以并行：

| 并行组合 | 预计时间 | 条件 |
|---------|---------|------|
| Phase 3 + Phase 2 后半段 | 3 周 | Phase 2 前半段完成 |
| Phase 4 + Phase 2 | 3 周 | Phase 2 核心功能完成 |
| Phase 5 + Phase 4 | 2 周 | Phase 4 测试就绪 |
| Phase 6 + Phase 5 | 2 周 | Phase 5 核心完成 |

**最短时间**: ~9 周（大量并行）  
**推荐时间**: 12 周（稳定可靠）

---

## 📝 快速开始

### 方式 A: 从 Phase 1 开始（推荐）

```bash
# 1. 阅读 Phase 1 计划
cat docs/superpowers/plans/2026-06-04-phase-1-security-typescript.md

# 2. 开始执行（选择一种方式）
# 方式 A: 使用 subagent-driven
Use superpowers:subagent-driven-development with plan=docs/superpowers/plans/2026-06-04-phase-1-security-typescript.md

# 方式 B: 使用 inline execution
Use superpowers:executing-plans with plan=docs/superpowers/plans/2026-06-04-phase-1-security-typescript.md
```

### 方式 B: 直接开始某个特定阶段

```bash
# 例如直接开始 Phase 2
Use superpowers:executing-plans with plan=docs/superpowers/plans/2026-06-04-phase-2-core-features.md
```

---

## ✅ 验收标准

每个阶段完成后，检查对应的验收标准：

- **Phase 1**: `pnpm build` 无错误，`pnpm audit` 无高危漏洞
- **Phase 2**: 所有页面 CRUD 完成度 > 90%
- **Phase 3**: API 响应时间 < 200ms，Lighthouse > 80
- **Phase 4**: 测试覆盖率 > 60%
- **Phase 5**: CI/CD 全自动化
- **Phase 6**: 用户体验达到产品级标准

---

## 🆘 常见问题

### Q: 可以跳过某个阶段吗？

**A**: 不推荐。每个阶段都有依赖关系。但如果是紧急修复，可以：
- 跳过 Phase 6（用户体验优化不影响功能）
- Phase 3 和 4 可以部分并行

### Q: 如何调整优先级？

**A**: 编辑 `docs/superpowers/specs/2026-06-04-aigate-comprehensive-optimization-plan.md`，然后重新生成计划。

### Q: 中途中断了怎么办？

**A**: 每个阶段都是独立的，可以直接从断点继续。查看阶段完成检查清单，从未完成的任务继续。

### Q: Token 预算不足怎么办？

**A**: 使用 Inline Execution 模式，每次执行 1-2 个阶段，分多次会话完成。

---

## 📞 需要帮助？

如果在执行过程中遇到问题：

1. 📖 查看 `docs/superpowers/specs/` 中的设计文档
2. 🔍 使用 `brainstorming` skill 重新分析问题
3. 📝 使用 `writing-plans` 创建新的计划
4. 🐛 使用 `systematic-debugging` 解决技术问题

---

## 🎉 准备好开始了吗？

选择一个执行方式，让我们开始吧！

**推荐**: 使用 **subagent-driven-development** + **Phase 1** 开始
