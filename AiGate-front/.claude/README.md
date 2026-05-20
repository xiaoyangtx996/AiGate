# AiGate Claude Code 自动化配置完成 ✅

## 已创建的配置文件

### 1. 核心配置
- ✅ `.claude/settings.json` - 全局配置与 Hooks
- ✅ `CLAUDE.md` - 项目文档（Claude Code 自动加载）
- ✅ `.mcp.json` - MCP 服务器配置

### 2. 自定义技能
- ✅ `.claude/skills/ui-component/SKILL.md` - UI 组件生成器
- ✅ `.claude/skills/page-validator/SKILL.md` - 页面验证器

---

## 快速开始指南

### 第一步：配置 MCP 服务器（可选）

#### context7（推荐）
用于查询 Tailwind v4、React、ECharts 等库的最新文档。

1. 访问 https://upstash.com/ 注册账号
2. 获取 API Key
3. 编辑 `.mcp.json`，替换 `YOUR_API_KEY_HERE`
4. 重启 Claude Code

#### GitHub MCP（可选）
用于管理 PR、Issue、提交记录。

1. 安装 GitHub CLI：
   ```bash
   winget install GitHub.cli
   ```
2. 登录 GitHub：
   ```bash
   gh auth login
   ```
3. 生成 Personal Access Token：https://github.com/settings/tokens
   - 权限：repo, read:org, read:user
4. 编辑 `.mcp.json`，替换 `YOUR_GITHUB_TOKEN_HERE`
5. 将 `"disabled": true` 改为 `"disabled": false`
6. 重启 Claude Code

### 第二步：使用自定义技能

#### 生成 UI 组件
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

#### 验证页面（自动触发）
当你完成页面开发后，Claude 会自动调用 `page-validator` 检查 12 项设计规范。

你也可以手动请求验证：
```
请验证 UI/dashboard.html 是否符合设计规范
```

### 第三步：使用内置技能

#### 设计稿转代码
```bash
# 蓝湖设计稿转框架代码
/design-to-code

# 高保真原型与交互 Demo
/huashu-design 根据 AiGate_UI_Design_Spec.md 第 5.18 节，生成提示词库页面的高保真原型
```

#### 生成工作日报
```bash
/daily-report
```

---

## 自动化功能说明

### Hooks（自动触发）

#### PostToolUse - 自动格式化
- **触发时机**：每次编辑或创建文件后
- **执行命令**：`prettier --write {{file_path}}`
- **作用**：保持代码风格一致

#### PreToolUse - 保护关键文件
- **触发时机**：修改以下文件前
  - `docs/v2.0/AiGate_UI_Design_Spec.md`（设计规范）
  - `aigate_analysis.md`（架构分析）
  - `.claude/settings.json`（Claude 配置）
- **作用**：防止意外修改核心文档

### 权限配置
已预配置允许的命令：
- ✅ Read, Edit, Write, Glob, Grep
- ✅ Bash(prettier:*)
- ✅ Bash(git:*)
- ✅ Bash(npm:*)
- ✅ Bash(ls:*), Bash(cat:*), Bash(find:*)

---

## 常见使用场景

### 场景 1：创建新页面
```
根据 docs/v2.0/AiGate_UI_Design_Spec.md 第 5.13 节，
生成"配额申请审批"页面（quota-approval.html）
```

Claude 会：
1. 读取设计规范
2. 生成符合三主题的页面
3. 自动调用 `page-validator` 验证
4. 提供验证报告和修复建议

### 场景 2：生成组件
```
/ui-component component_name=Drawer component_type=drawer
```

Claude 会：
1. 读取设计规范和现有样式
2. 生成符合三主题的 Drawer 组件
3. 添加到 `design-system.html`
4. 生成使用文档

### 场景 3：查询文档（需配置 context7）
```
Tailwind v4 如何实现毛玻璃效果？
ECharts 5 如何配置主题切换？
React 18 useEffect 的最佳实践？
```

### 场景 4：设计变体探索
```
/huashu-design 为 dashboard.html 生成 3 个配色方案变体，
符合"禁紫蓝渐变"规则
```

### 场景 5：验证现有页面
```
请验证 UI/keys.html 是否符合设计规范，
重点检查：三主题支持、角色裁剪、图标使用
```

---

## 项目规范速查

### 设计约束（硬规则）
- ❌ **禁止**紫蓝渐变色
- ❌ **禁止**使用 Emoji
- ✅ **必须**使用 Lucide SVG 图标
- ✅ **必须**使用 CSS 变量
- ✅ **必须**支持三主题（dark/light/apple）
- ✅ 顶部导航栏**必须**有毛玻璃效果

### 三大主题
| 主题 | 主色 | 强调色 | 圆角 |
|------|------|--------|------|
| dark | Emerald | Amber | 0.75rem |
| light | Orange | Emerald | 0 |
| apple | Blue | Red | 1.125rem |

### 12 项验证清单
1. ✅ 三主题验证
2. ✅ 角色裁剪（data-roles）
3. ✅ 空状态处理
4. ✅ 加载状态（骨架屏）
5. ✅ 错误状态
6. ✅ 危险操作二次确认
7. ✅ 图表合规
8. ✅ 文案合规（无 Emoji、中文标点）
9. ✅ 图标合规（Lucide、stroke-width=2）
10. ✅ 可达性（键盘、焦点、对比度）
11. ✅ 响应式（1024/1440/1920）
12. ✅ 持久化（localStorage）

---

## 文件结构

```
AiGate/
├── .claude/
│   ├── settings.json              # 全局配置与 Hooks
│   ├── skills/
│   │   ├── ui-component/
│   │   │   └── SKILL.md          # UI 组件生成器
│   │   └── page-validator/
│   │       └── SKILL.md          # 页面验证器
│   ├── agents/                    # 自定义 Agent（预留）
│   └── memory/                    # 项目记忆（自动生成）
│
├── .mcp.json                      # MCP 服务器配置
├── CLAUDE.md                      # 项目文档（必读）
│
├── docs/
│   └── v2.0/
│       └── AiGate_UI_Design_Spec.md  # UI 设计规范
│
├── aigate_analysis.md             # 架构分析
│
└── UI/                            # 前端原型（30+ 页面）
    ├── design-system.html         # 设计系统展示
    ├── dashboard.html
    ├── organization.html
    └── ...
```

---

## 下一步建议

### 立即可用
1. ✅ 使用 `/ui-component` 生成所需组件
2. ✅ 让 Claude 根据设计规范生成新页面
3. ✅ 自动验证页面是否符合规范

### 可选配置
1. 配置 context7 MCP（查询最新文档）
2. 配置 GitHub MCP（管理 PR/Issue）
3. 安装 Prettier（启用自动格式化）

### 推荐工作流
```bash
# 1. 生成新页面
"根据设计规范第 5.X 节生成 [页面名称]"

# 2. 生成所需组件
/ui-component component_name=[组件名] component_type=[类型]

# 3. 自动验证（Claude 会自动调用）
# 查看验证报告，修复未通过项

# 4. 提交代码
git add .
git commit -m "feat: add [页面名称]"
```

---

## 故障排查

### Prettier 未安装
如果看到 "Prettier not configured" 提示：
```bash
# 安装 Prettier
npm install -D prettier

# 创建配置文件
echo '{"semi": true, "singleQuote": true}' > .prettierrc
```

### MCP 服务器无法连接
1. 检查 `.mcp.json` 中的 API Key 是否正确
2. 确认网络连接正常
3. 重启 Claude Code
4. 查看 Claude Code 日志：`--mcp-debug` 模式

### 技能无法调用
1. 确认技能文件路径正确：`.claude/skills/[name]/SKILL.md`
2. 检查 YAML frontmatter 格式
3. 重启 Claude Code 重新加载技能

---

## 相关文档

- **项目文档**：`CLAUDE.md`
- **设计规范**：`docs/v2.0/AiGate_UI_Design_Spec.md`
- **架构分析**：`aigate_analysis.md`
- **设计系统**：`UI/design-system.html`

---

**配置完成时间**：2026-05-20  
**配置版本**：v1.0

🎉 **恭喜！Claude Code 自动化配置已完成，开始高效开发吧！**
