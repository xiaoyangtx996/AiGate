---
name: ui-component
description: 根据 AiGate 设计规范生成 UI 组件，支持 dark/light/apple 三主题系统
disable-model-invocation: true
---

# UI 组件生成器

根据 AiGate v2.0 UI 设计规范自动生成符合三主题系统的 UI 组件。

## 输入参数

- **component_name**: 组件名称（如 Drawer、Timeline、PermissionMatrix、Toast）
- **component_type**: 组件类型
  - `button` - 按钮组件
  - `card` - 卡片组件
  - `table` - 表格组件
  - `form` - 表单组件
  - `modal` - 模态框
  - `drawer` - 抽屉组件
  - `timeline` - 时间线
  - `stepper` - 步骤向导
  - `matrix` - 权限矩阵
  - `chart` - 图表组件

## 执行流程

### 1. 读取设计规范
```bash
# 读取核心设计文档
Read docs/v2.0/AiGate_UI_Design_Spec.md

# 重点关注章节：
# - 第二章：视觉设计系统（Token、字体、间距）
# - 第六章：通用组件库（具体组件规范）
# - 第七章：数据可视化规范
```

### 2. 读取现有样式系统
```bash
# 获取现有 CSS 变量和主题定义
Read UI/design-system.html

# 提取关键信息：
# - CSS 变量定义（--bg-body, --brand-main 等）
# - 三主题切换逻辑（.dark, .light, .apple）
# - 现有组件样式模式
```

### 3. 生成组件代码

根据组件类型生成完整的 HTML + Tailwind CSS 代码：

#### 组件结构模板
```html
<!-- 组件容器 -->
<div class="[component-name]" data-theme-aware="true">
  <!-- 组件内容 -->
</div>

<!-- 使用示例 -->
<div class="example-section">
  <h3>使用示例</h3>
  <!-- 示例代码 -->
</div>
```

#### 必须遵循的设计约束

**颜色规范**：
- ✅ 使用 `var(--brand-main)` 和 `var(--brand-accent)`
- ✅ 状态色：成功用 emerald、警告用 amber、错误用 red
- ❌ **禁止**使用紫色、蓝色、靛蓝色渐变

**图标规范**：
- ✅ 统一使用 Lucide 图标
- ✅ 默认 `stroke-width: 2`
- ✅ 尺寸：16px（行内）、18px（列表）、24px（按钮）
- ❌ **禁止**使用 Emoji

**圆角规范**：
- 使用 `border-radius: var(--border-radius-base)`
- dark: 0.75rem
- light: 0（直角）
- apple: 1.125rem

**阴影规范**：
- 使用 `box-shadow: var(--shadow-card)`
- dark: none
- light: 4px 4px 0 #111
- apple: 0 4px 24px rgba(0,0,0,0.04)

**毛玻璃效果**（仅 apple 主题）：
```css
.apple .component {
  backdrop-filter: var(--backdrop-filter);
  -webkit-backdrop-filter: var(--backdrop-filter);
}
```

### 4. 添加到设计系统展示

将生成的组件添加到 `UI/design-system.html` 的对应章节：

```html
<!-- 在 design-system.html 中添加新章节 -->
<section class="ds-section">
  <h2 class="ds-title">
    [组件名称]
    <span class="text-sm font-normal" style="color: var(--text-secondary)">
      新增组件
    </span>
  </h2>
  <p class="ds-desc">
    [组件描述和使用场景]
  </p>
  
  <!-- 组件展示 -->
  <div class="grid gap-6">
    [生成的组件代码]
  </div>
</section>
```

### 5. 生成使用文档

为组件生成完整的使用文档：

```markdown
## [组件名称] 使用指南

### 基础用法
[代码示例]

### Props / 参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| ... | ... | ... | ... |

### 主题适配
- dark: [说明]
- light: [说明]
- apple: [说明]

### 可访问性
- 键盘导航：[说明]
- 屏幕阅读器：[说明]
- ARIA 属性：[说明]

### 注意事项
[特殊说明]
```

## 组件类型详细规范

### Drawer（抽屉）
- 从右侧滑入
- 宽度：480px / 640px / 80vw
- 头部：标题 + 副标题 + 关闭按钮
- 底部：sticky 操作条
- 支持叠层（最多 2 层）
- ESC 键关闭
- 焦点陷阱

### Timeline（时间线）
- 节点状态：成功（绿）/ 进行中（蓝）/ 失败（红）/ 未到（灰）
- 每节点：标题 + 时间 + 详情（可展开）
- 用于：密钥生命周期、文档处理、MCP 健康事件

### Stepper（步骤向导）
- 顶部步骤条（已完成 / 当前 / 未到）
- 每步独立验证
- 支持「保存草稿」「跳过此步」

### PermissionMatrix（权限矩阵）
- 行 = 资源（项目/部门/成员）
- 列 = 操作
- 单元格 = 三态：✅ 已授权 / ➖ 部分 / ❌ 未授权
- 批量勾选、按行/列全选

### Toast（提示）
- 位置：顶部居中
- 类型：success / warning / error / info
- 自动消失（3秒）
- 可手动关闭

### Modal（对话框）
- 居中显示
- 遮罩层（半透明黑）
- 危险操作需输入确认词
- ESC 关闭

### Table（表格）
- 头部 sticky
- 可排序、可配置列
- 密度切换（紧凑/默认/宽松）
- 行：hover 高亮、可勾选、可展开
- 分页：底部居右

## 输出格式

生成完成后输出：

```
✅ UI 组件生成完成

📦 组件信息
- 名称：[component_name]
- 类型：[component_type]
- 文件：UI/design-system.html（已更新）

🎨 主题支持
- ✅ dark（暗黑科技）
- ✅ light（杂志白亮）
- ✅ apple（拟物质感）

📋 设计规范检查
- ✅ 无紫蓝渐变
- ✅ 无 Emoji
- ✅ 使用 Lucide 图标
- ✅ 使用 CSS 变量
- ✅ 响应式适配

📖 使用方法
[简要说明如何在项目中使用此组件]

🔗 相关文档
- 设计规范：docs/v2.0/AiGate_UI_Design_Spec.md §6.[X]
- 设计系统：UI/design-system.html
```

## 示例调用

```bash
# 生成抽屉组件
/ui-component component_name=Drawer component_type=drawer

# 生成时间线组件
/ui-component component_name=Timeline component_type=timeline

# 生成权限矩阵
/ui-component component_name=PermissionMatrix component_type=matrix

# 生成 Toast 提示
/ui-component component_name=Toast component_type=modal
```

## 注意事项

1. **始终读取最新设计规范**：确保生成的组件符合最新的设计要求
2. **保持一致性**：与现有组件的样式和交互保持一致
3. **可访问性优先**：确保键盘导航、屏幕阅读器支持
4. **响应式设计**：在 1024px / 1440px / 1920px 宽度下测试
5. **性能考虑**：避免过度使用动画和复杂样式

## 相关文档

- 设计规范：`docs/v2.0/AiGate_UI_Design_Spec.md`
- 设计系统：`UI/design-system.html`
- 架构分析：`aigate_analysis.md`
