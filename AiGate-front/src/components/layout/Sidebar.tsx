import { BarChart3, Users2, Building2, Key, FileText, Puzzle, BookOpen, Bot, Bell, Settings, Receipt, ShieldCheck, ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, Plug, Code2, Workflow, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/ui'
import { clsx } from 'clsx'
import { SidebarItem } from './SidebarItem'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles?: string[]
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
  roles?: string[]
}

const navGroups: NavGroup[] = [
  {
    id: 'data-center',
    label: '数据中心',
    items: [
      { label: '数据大盘', path: '/dashboard', icon: <BarChart3 size={18} />, roles: ['sys_admin', 'tenant_admin', 'dept_lead', 'project_lead'] },
      { label: '我的工作台', path: '/workspace', icon: <LayoutDashboard size={18} />, roles: ['user'] },
    ],
  },
  {
    id: 'org-governance',
    label: '组织治理',
    items: [
      { label: '组织与配额', path: '/organization', icon: <Building2 size={18} />, roles: ['sys_admin', 'tenant_admin'] },
      { label: '用户管理', path: '/users', icon: <Users2 size={18} />, roles: ['sys_admin', 'tenant_admin'] },
      { label: '配额申请审批', path: '/quota-approval', icon: <Receipt size={18} />, roles: ['sys_admin', 'tenant_admin', 'dept_lead', 'project_lead'] },
    ],
  },
  {
    id: 'gateway',
    label: '网关与接入',
    items: [
      { label: '渠道管理', path: '/channels', icon: <Plug size={18} />, roles: ['sys_admin'] },
      { label: '模型资产', path: '/models', icon: <Puzzle size={18} />, roles: ['sys_admin'] },
      { label: '密钥管理', path: '/keys', icon: <Key size={18} /> },
      { label: '调用日志', path: '/logs', icon: <FileText size={18} /> },
    ],
  },
  {
    id: 'knowledge',
    label: '知识库',
    items: [
      { label: '项目知识库', path: '/knowledge', icon: <BookOpen size={18} />, roles: ['sys_admin', 'dept_lead', 'project_lead'] },
    ],
  },
  {
    id: 'assets',
    label: 'AI 资产市场',
    items: [
      { label: '提示词库', path: '/prompts', icon: <FileText size={18} /> },
      { label: 'MCP 工具', path: '/mcp', icon: <Puzzle size={18} />, roles: ['sys_admin', 'tenant_admin'] },
      { label: 'Skills 技能库', path: '/skills', icon: <Workflow size={18} />, roles: ['sys_admin', 'tenant_admin', 'project_lead'] },
      { label: 'Plugins 插件库', path: '/plugins', icon: <Plug size={18} />, roles: ['sys_admin', 'tenant_admin', 'project_lead'] },
      { label: 'Hooks 钩子库', path: '/hooks', icon: <Code2 size={18} />, roles: ['sys_admin'] },
    ],
  },
  {
    id: 'agent',
    label: 'Agent 中心',
    items: [{ label: 'Agent 中心', path: '/agent', icon: <Bot size={18} /> }],
  },
  {
    id: 'monitoring',
    label: '监控与合规',
    items: [
      { label: '预警中心', path: '/alerts', icon: <Bell size={18} /> },
      { label: '操作审计', path: '/audit', icon: <ShieldCheck size={18} />, roles: ['sys_admin'] },
    ],
  },
  {
    id: 'system',
    label: '系统',
    items: [
      { label: '系统设置', path: '/settings', icon: <Settings size={18} />, roles: ['sys_admin', 'tenant_admin'] },
    ],
  },
]

function SidebarContent({ collapsed, onItemClick }: { collapsed: boolean; onItemClick?: () => void }) {
  const { getEffectiveRole } = useAuth()
  const { expandedGroups, toggleGroup } = useUIStore()
  const currentRole = getEffectiveRole()

  const isItemVisible = (item: NavItem) => !item.roles || item.roles.includes(currentRole)
  const isGroupVisible = (group: NavGroup) => (!group.roles || group.roles.includes(currentRole)) && group.items.some(isItemVisible)

  return (
    <nav className="space-y-1">
      {navGroups.filter(isGroupVisible).map((group) => (
        <div key={group.id} className="nav-group py-2">
          {!collapsed && (
            <button
              onClick={() => toggleGroup(group.id)}
              className="nav-group-header w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              <span>{group.label}</span>
              <ChevronDown size={14} className={clsx('transform transition-transform duration-200', expandedGroups.includes(group.id) && 'rotate-180')} />
            </button>
          )}
          {(collapsed || expandedGroups.includes(group.id)) && (
            <div className={clsx('nav-items-container', collapsed ? 'space-y-1' : 'space-y-0.5 mt-1')}>
              {group.items.filter(isItemVisible).map((item) => (
                <SidebarItem
                  key={item.path}
                  label={item.label}
                  path={item.path}
                  icon={item.icon}
                  collapsed={collapsed}
                  onClick={onItemClick}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={clsx('sidebar sidebar-desktop', sidebarCollapsed && 'collapsed')}>
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 w-6 h-6 flex items-center justify-center rounded-full border z-10 transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)}>
          <aside className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-drawer-header">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center font-bold text-lg"
                  style={{ background: 'var(--brand-main)', color: 'var(--bg-body)', borderRadius: 'var(--border-radius-base)' }}
                >
                  A
                </div>
                <span className="text-lg font-bold tracking-tight">AiGate</span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="sidebar-drawer-close"
                aria-label="关闭侧边栏"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent collapsed={false} onItemClick={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
