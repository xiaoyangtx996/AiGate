---
name: page-validator
description: 自动验证页面是否符合 AiGate UI 设计规范的 12 项检查清单
user-invocable: false
---

# 页面验证器

当 Codex 完成页面开发或修改后，自动调用此技能进行设计规范验证。

## 触发时机

- 创建新的 HTML 页面
- 修改现有页面的核心结构
- 用户明确要求验证页面

## 验证清单（来自设计规范 §12）

### 1. 三主题验证
**检查项**：页面在 dark / light / apple 三种主题下都能正常显示

**验证方法**：
```bash
# 读取页面文件
Read [page_path]

# 检查是否使用 CSS 变量
grep "var(--" [page_path]

# 检查是否有硬编码颜色（应避免）
grep -E "#[0-9a-fA-F]{3,6}|rgb\(|rgba\(" [page_path]
```

**通过标准**：
- ✅ 使用 `var(--bg-body)`, `var(--brand-main)` 等 CSS 变量
- ✅ 无硬编码颜色值（除非在 CSS 变量定义中）
- ✅ 组件在三主题下视觉正常

**常见问题**：
- ❌ 直接使用 `bg-blue-500` 等 Tailwind 颜色类
- ❌ 硬编码 `#3b82f6` 等颜色值

---

### 2. 角色裁剪
**检查项**：使用 `data-roles` 属性，五种角色切换均符合权限矩阵

**验证方法**：
```bash
# 检查是否有 data-roles 属性
grep "data-roles=" [page_path]

# 检查是否有 applyRole() 函数调用
grep "applyRole()" [page_path]
```

**通过标准**：
- ✅ 需要权限控制的元素有 `data-roles="sys_admin,tenant_admin"`
- ✅ 页面底部有 `applyRole()` 调用
- ✅ 角色定义符合设计规范 §3.4 权限矩阵

**角色列表**：
- `sys_admin` - 集团 IT 管理员
- `tenant_admin` - 分公司管理员
- `dept_lead` - 部门负责人
- `project_lead` - 项目负责人
- `user` - 普通员工

---

### 3. 空状态处理
**检查项**：列表为空时有图标 + 文案 + 主操作

**验证方法**：
```bash
# 检查是否有空状态处理
grep -i "empty\|no.*data\|暂无" [page_path]
```

**通过标准**：
- ✅ 有空状态容器（通常是 `<div class="empty-state">`）
- ✅ 包含 Lucide 图标（大尺寸，36px 或 48px）
- ✅ 有友好的文案说明
- ✅ 有主操作按钮（如"立即创建"）

**示例**：
```html
<div class="empty-state text-center py-12">
  <svg class="w-12 h-12 mx-auto mb-4" style="color: var(--text-secondary)">
    <!-- Lucide icon -->
  </svg>
  <p style="color: var(--text-secondary)">还没有任何密钥</p>
  <button class="btn-primary mt-4">创建第一个密钥</button>
</div>
```

---

### 4. 加载状态（骨架屏）
**检查项**：异步数据有骨架屏，不出现"白屏 → 突然出现"

**验证方法**：
```bash
# 检查是否有加载状态
grep -i "loading\|skeleton\|加载中" [page_path]
```

**通过标准**：
- ✅ 有加载状态指示器或骨架屏
- ✅ 骨架屏结构与实际内容布局一致
- ✅ 使用动画效果（如脉冲动画）

---

### 5. 错误状态
**检查项**：网络错误、权限不足、资源不存在三种都有对应展示

**验证方法**：
```bash
# 检查是否有错误处理
grep -i "error\|错误\|失败" [page_path]
```

**通过标准**：
- ✅ 有错误状态展示
- ✅ 错误信息清晰易懂
- ✅ 提供重试或返回操作

---

### 6. 危险操作二次确认
**检查项**：吊销/删除/下线都有二次确认 + 审计落库

**验证方法**：
```bash
# 检查危险操作
grep -i "delete\|remove\|revoke\|吊销\|删除\|下线" [page_path]

# 检查是否有确认对话框
grep -i "confirm\|modal\|确认" [page_path]
```

**通过标准**：
- ✅ 危险操作有二次确认对话框
- ✅ 对话框说明操作后果
- ✅ 高危操作需要输入确认词（如 "DELETE"）

---

### 7. 图表合规
**检查项**：标题 / 时间 / 单位 / 来源齐全，Tooltip 精确

**验证方法**：
```bash
# 检查是否有图表
grep -i "chart\|echarts\|图表" [page_path]
```

**通过标准**：
- ✅ 图表有标题
- ✅ 有时间范围说明
- ✅ Y 轴有单位
- ✅ 有数据来源说明
- ✅ Tooltip 显示精确数值

---

### 8. 文案合规
**检查项**：无 Emoji、中文标点、状态术语统一

**验证方法**：
```bash
# 检查是否有 Emoji
grep -P "[\x{1F300}-\x{1F9FF}]" [page_path]

# 检查英文标点（应使用中文标点）
grep -E '"|"' [page_path]
```

**通过标准**：
- ✅ 无 Emoji 字符
- ✅ 使用中文标点：「」而非 ""，——而非 ---
- ✅ 状态术语统一（已启用/已停用，不用"开/关"）

**术语对照表**：
| 含义 | 正确用语 | 错误用语 |
|------|----------|----------|
| 启用/停用 | 已启用/已停用 | 开/关、在/不在 |
| 通过/拒绝 | 已通过/已驳回 | 同意/不同意 |
| 删除 | 删除/吊销/下线 | 移除 |
| 配额 | 配额 | 额度、限额 |

---

### 9. 图标合规
**检查项**：Lucide、`stroke-width=2`、尺寸符合规范

**验证方法**：
```bash
# 检查图标使用
grep -i "lucide\|icon\|svg" [page_path]

# 检查是否有 Emoji（应避免）
grep -P "[\x{1F300}-\x{1F9FF}]" [page_path]
```

**通过标准**：
- ✅ 使用 Lucide 图标库
- ✅ `stroke-width="2"`（默认）
- ✅ 尺寸符合规范：
  - 12/14/16px（行内）
  - 18px（导航/列表）
  - 20/24px（按钮/标题）
  - 36/48px（空状态）

---

### 10. 可达性（Accessibility）
**检查项**：键盘可达、焦点可见、对比度 ≥ AA、必填字段标 `*`

**验证方法**：
```bash
# 检查 ARIA 属性
grep -i "aria-\|role=" [page_path]

# 检查必填字段
grep -i "required\|必填" [page_path]
```

**通过标准**：
- ✅ 交互元素可键盘访问（Tab 导航）
- ✅ 焦点状态可见
- ✅ 必填字段有 `*` 标记
- ✅ 图片有 alt 属性
- ✅ 表单有 label

---

### 11. 响应式
**检查项**：1024 / 1440 / 1920 三种宽度均无横向滚动

**验证方法**：
```bash
# 检查是否有响应式类
grep -E "sm:|md:|lg:|xl:|2xl:" [page_path]

# 检查是否有固定宽度（可能导致问题）
grep -E "w-\[.*px\]" [page_path]
```

**通过标准**：
- ✅ 使用响应式 Tailwind 类（md:、lg:、xl:）
- ✅ 容器使用 `max-w-7xl mx-auto`
- ✅ 在 1024px / 1440px / 1920px 宽度下测试正常

---

### 12. 持久化
**检查项**：主题 / 角色 / 侧栏展开 / 表格列设置写入 localStorage

**验证方法**：
```bash
# 检查 localStorage 使用
grep -i "localStorage" [page_path]
```

**通过标准**：
- ✅ 主题选择存储到 `localStorage.aigate_theme`
- ✅ 角色模拟存储到 `localStorage.aigate_role`
- ✅ 用户偏好设置持久化

---

## 验证流程

### 步骤 1：读取页面文件
```bash
Read [page_path]
```

### 步骤 2：执行 12 项检查
逐项执行上述检查，记录通过和未通过的项目。

### 步骤 3：生成验证报告

## 输出格式

```markdown
## 页面验证报告

📄 **页面**：[page_name]
📍 **路径**：[page_path]
⏰ **验证时间**：[timestamp]

---

### ✅ 通过项（X/12）

1. ✅ 三主题验证 - 正确使用 CSS 变量
2. ✅ 角色裁剪 - 已配置 data-roles 属性
3. ✅ 空状态处理 - 有完整的空状态展示
...

---

### ❌ 未通过项（X/12）

1. ❌ **文案合规** - 发现 3 处 Emoji
   - 位置：第 45 行、第 78 行、第 102 行
   - 修复建议：将 Emoji 替换为 Lucide 图标

2. ❌ **图表合规** - 缺少数据来源说明
   - 位置：第 156 行图表
   - 修复建议：添加 "数据来源：实时统计" 说明

...

---

### 📊 验证得分

**总分**：X/12（XX%）

- 🟢 优秀（≥10）：页面完全符合设计规范
- 🟡 良好（8-9）：有少量问题需要修复
- 🔴 需改进（<8）：存在多处不符合规范的问题

---

### 🔧 修复建议

**优先级 P0（必须修复）**：
1. [具体问题和修复方法]

**优先级 P1（建议修复）**：
1. [具体问题和修复方法]

---

### 📚 相关文档

- 设计规范：docs/v2.0/AiGate_UI_Design_Spec.md §12
- 设计系统：UI/design-system.html
```

## 自动修复建议

对于常见问题，提供具体的修复代码：

### 问题：使用了硬编码颜色
```html
<!-- ❌ 错误 -->
<div class="bg-blue-500 text-white">

<!-- ✅ 正确 -->
<div style="background-color: var(--brand-main); color: var(--text-primary)">
```

### 问题：缺少角色裁剪
```html
<!-- ❌ 错误 -->
<button>删除用户</button>

<!-- ✅ 正确 -->
<button data-roles="sys_admin,tenant_admin">删除用户</button>
```

### 问题：使用了 Emoji
```html
<!-- ❌ 错误 -->
<span>🔑 密钥管理</span>

<!-- ✅ 正确 -->
<span class="flex items-center gap-2">
  <svg class="w-4 h-4" stroke-width="2"><!-- Lucide key icon --></svg>
  密钥管理
</span>
```

## 注意事项

1. **非阻塞验证**：验证失败不应阻止页面开发，而是提供改进建议
2. **上下文感知**：根据页面类型调整验证重点（如登录页不需要角色裁剪）
3. **持续改进**：随着设计规范更新，同步更新验证规则
4. **友好反馈**：提供具体的修复建议和代码示例

## 相关文档

- 设计规范：`docs/v2.0/AiGate_UI_Design_Spec.md`
- 设计走查清单：`docs/v2.0/AiGate_UI_Design_Spec.md` §12
