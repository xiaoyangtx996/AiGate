# SaaS 标准交互设计文档

> **日期**：2026-05-20
> **状态**：已确认
> **范围**：侧边栏折叠 + 全局搜索

---

## 一、侧边栏折叠

### 1.1 交互逻辑

| 状态 | 宽度 | 内容 | 触发方式 |
|------|------|------|----------|
| **折叠态** | 64px | 仅图标 | 默认状态 |
| **展开态** | 260px | 图标 + 文字 + 分组 | 点击展开按钮 |

### 1.2 交互细节

**折叠态**：
- 图标居中显示（每个菜单项 40x40px）
- 鼠标悬浮显示 tooltip（菜单名称，右侧弹出）
- 当前页菜单项高亮背景色
- 分组标题隐藏，仅显示分组图标

**展开态**：
- 图标 + 文字水平排列
- 分组标题显示，可点击折叠/展开子菜单
- 分组折叠状态独立于侧边栏折叠状态

**过渡动画**：
- 宽度变化：`transition: width 300ms ease`
- 内容淡入：`transition: opacity 200ms ease 100ms`

### 1.3 状态持久化

```typescript
// localStorage 键名
localStorage.aigate_sidebar_collapsed  // "true" | "false"
localStorage.aigate_nav_groups         // JSON.stringify(["data-center", "org-governance", ...])
```

### 1.4 响应式适配

| 断点 | 行为 |
|------|------|
| < 768px | 侧边栏隐藏，顶栏显示汉堡按钮，点击弹出 Drawer |
| 768-1024px | 仅支持折叠态（64px），不支持展开 |
| ≥ 1024px | 支持折叠/展开切换 |

---

## 二、全局搜索（⌘K）

### 2.1 触发方式

| 方式 | 说明 |
|------|------|
| 顶栏按钮 | 点击搜索图标 |
| 快捷键 | `⌘K`（Mac）/ `Ctrl+K`（Windows） |

### 2.2 搜索框设计

**位置**：屏幕居中，Modal 形式弹出

**布局**：
```
┌─────────────────────────────────────────────┐
│  🔍  输入搜索内容...                    ⌘K  │
├─────────────────────────────────────────────┤
│  最近搜索                                    │
│    · 数据大盘                                │
│    · 密钥管理                                │
├─────────────────────────────────────────────┤
│  搜索结果                                    │
│  ────────────────────────────────────────── │
│  📊 数据大盘                    [菜单]       │
│  🔑 密钥管理                    [菜单]       │
│  👤 张三                        [员工]       │
│  🔑 ag-prod-8f2c...e1b9        [密钥]       │
│  🧩 GitHub API                  [MCP]        │
└─────────────────────────────────────────────┘
```

### 2.3 搜索范围

| 类型 | 搜索字段 | 图标 | 跳转 |
|------|----------|------|------|
| 菜单 | 名称、路径 | 对应菜单图标 | 直接跳转 |
| 员工 | 名称、邮箱 | User | 用户详情 |
| 密钥 | 别名、前缀 | Key | 密钥详情 |
| MCP | 名称、描述 | Puzzle | MCP 详情 |
| 知识库 | 名称 | BookOpen | 知识库详情 |
| Agent | 名称 | Bot | Agent 详情 |

### 2.4 交互逻辑

**输入**：
- 输入框自动聚焦
- 输入时实时过滤（debounce 300ms）
- 空输入显示最近搜索记录

**导航**：
- `↑↓` 选择结果项
- `Enter` 跳转到选中项
- `Esc` 关闭搜索框
- 点击结果项跳转

**结果展示**：
- 分组显示（菜单、员工、密钥、MCP、知识库、Agent）
- 每组最多显示 5 条
- 高亮命中关键字
- 无结果显示"未找到匹配项"

### 2.5 权限控制

搜索结果按当前角色过滤：
- `sys_admin`：可见所有
- `tenant_admin`：可见本公司数据
- `dept_lead`：可见本部门数据
- `project_lead`：可见本项目数据
- `user`：仅可见自己的密钥和授权的 Agent

---

## 三、技术实现

### 3.1 组件结构

```
src/components/
├── layout/
│   ├── Sidebar.tsx          # 重构：支持折叠/展开
│   ├── SidebarItem.tsx      # 新增：菜单项（含 tooltip）
│   └── SidebarGroup.tsx     # 新增：菜单分组
│
└── search/
    ├── GlobalSearch.tsx      # 新增：搜索框主组件
    ├── SearchResult.tsx      # 新增：搜索结果项
    └── SearchProvider.tsx    # 新增：搜索状态管理
```

### 3.2 状态管理

```typescript
// stores/ui.ts 扩展
interface UIState {
  // 已有
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  
  // 新增
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  recentSearches: string[]
  addRecentSearch: (term: string) => void
}
```

### 3.3 快捷键监听

```typescript
// hooks/useKeyboard.ts
export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      
      // Esc 关闭搜索
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

---

## 四、验收标准

### 4.1 侧边栏折叠

- [ ] 默认折叠状态（64px 宽度）
- [ ] 点击展开按钮切换状态
- [ ] 折叠态显示 tooltip
- [ ] 展开态显示完整菜单
- [ ] 状态持久化到 localStorage
- [ ] 过渡动画流畅（300ms）
- [ ] 响应式适配（移动端 Drawer）

### 4.2 全局搜索

- [ ] ⌘K / Ctrl+K 唤起搜索
- [ ] 搜索框居中弹出
- [ ] 输入时实时过滤
- [ ] 分组显示搜索结果
- [ ] 键盘导航（↑↓ Enter Esc）
- [ ] 高亮命中关键字
- [ ] 权限过滤搜索结果
- [ ] 最近搜索记录

---

**文档结束**
