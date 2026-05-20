# SaaS 标准交互实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现侧边栏折叠和全局搜索功能，提升 SaaS 后台交互体验

**Architecture:** 重构 Sidebar 组件支持折叠/展开，新增 GlobalSearch 组件实现 ⌘K 搜索

**Tech Stack:** React 18, TypeScript, Zustand, Lucide React

---

## 文件结构

```
AiGate-front/src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # 重构：支持折叠/展开
│   │   ├── SidebarItem.tsx      # 新增：菜单项（含 tooltip）
│   │   └── MainLayout.tsx       # 修改：适配折叠态
│   │
│   └── search/
│       └── GlobalSearch.tsx      # 新增：搜索框主组件
│
├── hooks/
│   └── useKeyboard.ts           # 新增：快捷键监听
│
└── stores/
    └── ui.ts                    # 修改：添加搜索相关状态
```

---

## Task 1: 修改 UI Store 添加搜索状态

**Files:**
- Modify: `AiGate-front/src/stores/ui.ts`

- [ ] **Step 1: 添加搜索相关状态到 ui.ts**

```typescript
// 在 UIState interface 中添加
recentSearches: string[]
addRecentSearch: (term: string) => void
clearRecentSearches: () => void
```

```typescript
// 在 store 实现中添加
recentSearches: [],
addRecentSearch: (term) => {
  const { recentSearches } = get()
  const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5)
  set({ recentSearches: updated })
},
clearRecentSearches: () => set({ recentSearches: [] }),
```

```typescript
// 在 partialize 中添加
recentSearches: state.recentSearches,
```

- [ ] **Step 2: 验证修改**

运行 `npm run type-check` 确保无类型错误

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/stores/ui.ts
git commit -m "feat: 添加搜索相关状态到 UI store"
```

---

## Task 2: 创建 SidebarItem 组件

**Files:**
- Create: `AiGate-front/src/components/layout/SidebarItem.tsx`

- [ ] **Step 1: 创建 SidebarItem 组件**

```typescript
// AiGate-front/src/components/layout/SidebarItem.tsx
import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'

interface SidebarItemProps {
  label: string
  path: string
  icon: React.ReactNode
  collapsed: boolean
}

export function SidebarItem({ label, path, icon, collapsed }: SidebarItemProps) {
  const location = useLocation()
  const isActive = location.pathname === path

  return (
    <Link
      to={path}
      className={clsx(
        'nav-item relative group',
        collapsed && 'justify-center',
        isActive && 'active'
      )}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
      
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 text-xs font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-dropdown)' }}
        >
          {label}
        </div>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: 验证组件**

运行 `npm run type-check` 确保无类型错误

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/components/layout/SidebarItem.tsx
git commit -m "feat: 创建 SidebarItem 组件支持折叠 tooltip"
```

---

## Task 3: 重构 Sidebar 组件支持折叠

**Files:**
- Modify: `AiGate-front/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: 重构 Sidebar 组件**

重构要点：
1. 使用 SidebarItem 组件替代直接渲染 Link
2. 折叠态隐藏分组标题，只显示第一个菜单项的图标
3. 添加展开/折叠按钮
4. 折叠态显示 tooltip

```typescript
// AiGate-front/src/components/layout/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Users2, Building2, Key, FileText, Puzzle, BookOpen, Bot, Bell, Settings, Receipt, ShieldCheck, ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, Plug, Code2, Workflow } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/ui'
import { clsx } from 'clsx'
import { SidebarItem } from './SidebarItem'

// ... navGroups 定义保持不变 ...

export function Sidebar() {
  const location = useLocation()
  const { getEffectiveRole } = useAuth()
  const { expandedGroups, toggleGroup, sidebarCollapsed, toggleSidebar } = useUIStore()
  const currentRole = getEffectiveRole()

  const isItemVisible = (item: NavItem) => !item.roles || item.roles.includes(currentRole)
  const isGroupVisible = (group: NavGroup) => (!group.roles || group.roles.includes(currentRole)) && group.items.some(isItemVisible)

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 flex items-center justify-center rounded-full border z-10 transition-colors"
        style={{ 
          backgroundColor: 'var(--bg-surface)', 
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)'
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav className="space-y-1">
        {navGroups.filter(isGroupVisible).map((group) => (
          <div key={group.id} className="nav-group py-2">
            {/* Group header - hidden when collapsed */}
            {!sidebarCollapsed && (
              <button
                onClick={() => toggleGroup(group.id)}
                className="nav-group-header w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown size={14} className={clsx('transform transition-transform duration-200', expandedGroups.includes(group.id) && 'rotate-180')} />
              </button>
            )}
            
            {/* Items */}
            {(sidebarCollapsed || expandedGroups.includes(group.id)) && (
              <div className={clsx('nav-items-container', sidebarCollapsed ? 'space-y-1' : 'space-y-0.5 mt-1')}>
                {group.items.filter(isItemVisible).map((item) => (
                  <SidebarItem
                    key={item.path}
                    label={item.label}
                    path={item.path}
                    icon={item.icon}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: 修改 CSS 支持折叠态**

在 `components.css` 中添加：

```css
/* Sidebar collapsed state */
.sidebar.collapsed {
  width: 64px;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.5rem;
}

.sidebar.collapsed .nav-item span {
  display: none;
}
```

- [ ] **Step 3: 验证修改**

运行 `npm run dev` 查看效果

- [ ] **Step 4: 提交**

```bash
git add AiGate-front/src/components/layout/Sidebar.tsx AiGate-front/src/styles/components.css
git commit -m "feat: 重构 Sidebar 支持折叠/展开切换"
```

---

## Task 4: 创建 useKeyboard Hook

**Files:**
- Create: `AiGate-front/src/hooks/useKeyboard.ts`

- [ ] **Step 1: 创建 useKeyboard hook**

```typescript
// AiGate-front/src/hooks/useKeyboard.ts
import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui'

export function useKeyboard() {
  const { setSearchOpen, searchOpen } = useUIStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
      
      // Esc 关闭搜索
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, setSearchOpen])
}
```

- [ ] **Step 2: 验证 hook**

运行 `npm run type-check` 确保无类型错误

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/hooks/useKeyboard.ts
git commit -m "feat: 创建 useKeyboard hook 监听快捷键"
```

---

## Task 5: 创建 GlobalSearch 组件

**Files:**
- Create: `AiGate-front/src/components/search/GlobalSearch.tsx`

- [ ] **Step 1: 创建 GlobalSearch 组件**

```typescript
// AiGate-front/src/components/search/GlobalSearch.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, BarChart3, Key, Puzzle, BookOpen, Bot, Users2, FileText, Clock } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'

interface SearchResult {
  id: string
  type: 'menu' | 'user' | 'key' | 'mcp' | 'knowledge' | 'agent'
  label: string
  description?: string
  path: string
  icon: React.ReactNode
}

// Mock data - in production, this would come from API
const MOCK_DATA: SearchResult[] = [
  { id: '1', type: 'menu', label: '数据大盘', path: '/dashboard', icon: <BarChart3 size={16} /> },
  { id: '2', type: 'menu', label: '密钥管理', path: '/keys', icon: <Key size={16} /> },
  { id: '3', type: 'menu', label: 'MCP 工具', path: '/mcp', icon: <Puzzle size={16} /> },
  { id: '4', type: 'menu', label: '知识库', path: '/knowledge', icon: <BookOpen size={16} /> },
  { id: '5', type: 'menu', label: 'Agent 中心', path: '/agent', icon: <Bot size={16} /> },
  { id: '6', type: 'menu', label: '用户管理', path: '/users', icon: <Users2 size={16} /> },
  { id: '7', type: 'menu', label: '调用日志', path: '/logs', icon: <FileText size={16} /> },
  // Mock users
  { id: '10', type: 'user', label: '张三', description: 'zhangsan@aigate.com', path: '/users', icon: <Users2 size={16} /> },
  { id: '11', type: 'user', label: '李四', description: 'lisi@aigate.com', path: '/users', icon: <Users2 size={16} /> },
  // Mock keys
  { id: '20', type: 'key', label: 'Cursor 专用', description: 'ag-prod-8f2c...e1b9', path: '/keys', icon: <Key size={16} /> },
  // Mock MCP
  { id: '30', type: 'mcp', label: 'GitHub API', description: '代码库搜索、Issue 管理', path: '/mcp', icon: <Puzzle size={16} /> },
  // Mock knowledge
  { id: '40', type: 'knowledge', label: 'AiGate 设计文档', path: '/knowledge', icon: <BookOpen size={16} /> },
  // Mock agents
  { id: '50', type: 'agent', label: 'AiGate Bot', description: '管理 Agent', path: '/agent', icon: <Bot size={16} /> },
]

const TYPE_LABELS: Record<string, string> = {
  menu: '菜单',
  user: '员工',
  key: '密钥',
  mcp: 'MCP',
  knowledge: '知识库',
  agent: 'Agent',
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const { searchOpen, setSearchOpen, recentSearches, addRecentSearch } = useUIStore()
  const { getEffectiveRole } = useAuth()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Filter results based on query and role
  const results = query.trim()
    ? MOCK_DATA.filter((item) => {
        const matchesQuery = item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
        // In production, add role-based filtering here
        return matchesQuery
      }).slice(0, 20)
    : []

  // Group results by type
  const groupedResults = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {} as Record<string, SearchResult[]>)

  // Reset state when opening/closing
  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }, [results, selectedIndex])

  // Select result
  const handleSelect = (result: SearchResult) => {
    addRecentSearch(result.label)
    navigate(result.path)
    setSearchOpen(false)
  }

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setSearchOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Search dialog */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-lg overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-dropdown)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Search size={18} className="text-secondary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="搜索菜单、员工、密钥、MCP..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[300px] overflow-y-auto p-2">
          {query.trim() === '' ? (
            /* Recent searches */
            recentSearches.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-secondary flex items-center gap-2">
                  <Clock size={12} /> 最近搜索
                </div>
                {recentSearches.map((term, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-elevated transition-colors text-left"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => setQuery(term)}
                  >
                    <Search size={14} className="text-secondary" />
                    {term}
                  </button>
                ))}
              </div>
            )
          ) : results.length === 0 ? (
            /* No results */
            <div className="px-4 py-8 text-center text-secondary text-sm">
              未找到匹配项
            </div>
          ) : (
            /* Search results */
            Object.entries(groupedResults).map(([type, items]) => (
              <div key={type}>
                <div className="px-2 py-1.5 text-xs font-medium text-secondary">
                  {TYPE_LABELS[type]}
                </div>
                {items.map((item) => {
                  const globalIndex = results.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-left',
                        globalIndex === selectedIndex ? 'bg-elevated' : 'hover:bg-elevated'
                      )}
                      style={{ color: 'var(--text-primary)' }}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <span className="flex-shrink-0 text-secondary">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        {item.description && (
                          <div className="text-xs text-secondary truncate">{item.description}</div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {TYPE_LABELS[item.type]}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证组件**

运行 `npm run type-check` 确保无类型错误

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/components/search/GlobalSearch.tsx
git commit -m "feat: 创建全局搜索组件 GlobalSearch"
```

---

## Task 6: 集成到 MainLayout

**Files:**
- Modify: `AiGate-front/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: 修改 MainLayout 集成搜索**

```typescript
// AiGate-front/src/components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom'
import { MasterNav } from './MasterNav'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { useKeyboard } from '@/hooks/useKeyboard'

export function MainLayout() {
  // Initialize keyboard shortcuts
  useKeyboard()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <MasterNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
      <GlobalSearch />
    </div>
  )
}
```

- [ ] **Step 2: 修改 MasterNav 搜索按钮**

修改 `MasterNav.tsx` 中的搜索按钮，点击时打开搜索：

```typescript
// 在 MasterNav 组件中
const { searchOpen, setSearchOpen } = useUIStore()

// 修改搜索按钮
<button
  onClick={() => setSearchOpen(true)}
  className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors rounded-lg"
  style={{ backgroundColor: 'var(--bg-elevated)' }}
>
  <Search size={16} />
  <span className="hidden md:inline">搜索</span>
  <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-surface rounded"
    style={{ backgroundColor: 'var(--bg-surface)' }}
  >
    ⌘K
  </kbd>
</button>
```

- [ ] **Step 3: 验证集成**

运行 `npm run dev` 测试：
1. 侧边栏折叠/展开功能
2. ⌘K 打开搜索
3. 搜索框输入和结果展示
4. 键盘导航
5. 点击结果跳转

- [ ] **Step 4: 提交**

```bash
git add AiGate-front/src/components/layout/MainLayout.tsx AiGate-front/src/components/layout/MasterNav.tsx
git commit -m "feat: 集成全局搜索到主布局"
```

---

## Task 7: 最终验证和提交

- [ ] **Step 1: 运行类型检查**

```bash
cd AiGate-front && npm run type-check
```

预期：无错误

- [ ] **Step 2: 运行构建**

```bash
cd AiGate-front && npm run build
```

预期：构建成功

- [ ] **Step 3: 提交所有变更**

```bash
git add -A
git commit -m "feat: 实现 SaaS 标准交互（侧边栏折叠 + 全局搜索）"
```

---

## 验收清单

### 侧边栏折叠

- [ ] 默认折叠状态（64px 宽度）
- [ ] 点击展开按钮切换状态
- [ ] 折叠态显示 tooltip
- [ ] 展开态显示完整菜单
- [ ] 状态持久化到 localStorage
- [ ] 过渡动画流畅（300ms）

### 全局搜索

- [ ] ⌘K / Ctrl+K 唤起搜索
- [ ] 搜索框居中弹出
- [ ] 输入时实时过滤
- [ ] 分组显示搜索结果
- [ ] 键盘导航（↑↓ Enter Esc）
- [ ] 高亮命中关键字
- [ ] 最近搜索记录

---

**计划完成，保存到 `docs/superpowers/plans/2026-05-20-saas-standard-interaction.md`**

**两种执行方式：**

**1. Subagent-Driven（推荐）** - 每个任务分发一个独立子代理执行，任务间可审查

**2. Inline Execution** - 在当前会话中批量执行，带检查点

选择哪种方式？
