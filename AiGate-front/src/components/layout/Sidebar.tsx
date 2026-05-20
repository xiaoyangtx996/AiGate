import { BarChart3, Users2, Building2, Key, FileText, Puzzle, BookOpen, Bot, Bell, Settings, Receipt, ShieldCheck, ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, Plug, Code2, Workflow, X, Palette, Shield, FolderTree } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

function SidebarContent({ collapsed, onItemClick }: { collapsed: boolean; onItemClick?: () => void }) {
  const { t } = useTranslation('nav')
  const { getEffectiveRole } = useAuth()
  const { expandedGroups, toggleGroup } = useUIStore()

  const navGroups: NavGroup[] = [
    {
      id: 'data-center',
      label: t('dataCenter'),
      items: [
        { label: t('dashboard'), path: '/dashboard', icon: <BarChart3 size={18} />, roles: ['sys_admin', 'tenant_admin', 'dept_lead', 'project_lead'] },
        { label: t('workspace'), path: '/workspace', icon: <LayoutDashboard size={18} />, roles: ['user'] },
      ],
    },
    {
      id: 'org-governance',
      label: t('orgGovernance'),
      items: [
        { label: t('organization'), path: '/organization', icon: <Building2 size={18} />, roles: ['sys_admin', 'tenant_admin'] },
        { label: t('users'), path: '/users', icon: <Users2 size={18} />, roles: ['sys_admin', 'tenant_admin'] },
        { label: t('roleManage'), path: '/role-manage', icon: <Shield size={18} />, roles: ['sys_admin'] },
        { label: t('quotaApproval'), path: '/quota-approval', icon: <Receipt size={18} />, roles: ['sys_admin', 'tenant_admin', 'dept_lead', 'project_lead'] },
      ],
    },
    {
      id: 'gateway',
      label: t('gateway'),
      items: [
        { label: t('channels'), path: '/channels', icon: <Plug size={18} />, roles: ['sys_admin'] },
        { label: t('models'), path: '/models', icon: <Puzzle size={18} />, roles: ['sys_admin'] },
        { label: t('keys'), path: '/keys', icon: <Key size={18} /> },
        { label: t('logs'), path: '/logs', icon: <FileText size={18} /> },
      ],
    },
    {
      id: 'knowledge',
      label: t('knowledge'),
      items: [
        { label: t('projectKnowledge'), path: '/knowledge', icon: <BookOpen size={18} />, roles: ['sys_admin', 'dept_lead', 'project_lead'] },
      ],
    },
    {
      id: 'assets',
      label: t('aiAssets'),
      items: [
        { label: t('prompts'), path: '/prompts', icon: <FileText size={18} /> },
        { label: t('mcpTools'), path: '/mcp', icon: <Puzzle size={18} />, roles: ['sys_admin', 'tenant_admin'] },
        { label: t('skills'), path: '/skills', icon: <Workflow size={18} />, roles: ['sys_admin', 'tenant_admin', 'project_lead'] },
        { label: t('plugins'), path: '/plugins', icon: <Plug size={18} />, roles: ['sys_admin', 'tenant_admin', 'project_lead'] },
        { label: t('hooks'), path: '/hooks', icon: <Code2 size={18} />, roles: ['sys_admin'] },
      ],
    },
    {
      id: 'agent',
      label: t('agentCenter'),
      items: [{ label: t('agentCenter'), path: '/agent', icon: <Bot size={18} /> }],
    },
    {
      id: 'monitoring',
      label: t('monitoring'),
      items: [
        { label: t('alerts'), path: '/alerts', icon: <Bell size={18} /> },
        { label: t('audit'), path: '/audit', icon: <ShieldCheck size={18} />, roles: ['sys_admin'] },
      ],
    },
    {
      id: 'system',
      label: t('system'),
      items: [
        { label: t('settings'), path: '/settings', icon: <Settings size={18} />, roles: ['sys_admin', 'tenant_admin'] },
        { label: t('menuManage'), path: '/menu-manage', icon: <FolderTree size={18} />, roles: ['sys_admin'] },
        { label: t('designSystem'), path: '/design-system', icon: <Palette size={18} />, roles: ['sys_admin'] },
      ],
    },
  ]
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

  const handleMobileItemClick = () => {
    // 延迟关闭抽屉，让路由跳转先完成
    setTimeout(() => setMobileSidebarOpen(false), 100)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={clsx('sidebar sidebar-desktop', sidebarCollapsed && 'collapsed')}>
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile sidebar drawer */}
      <div
        className={clsx('sidebar-overlay', mobileSidebarOpen ? 'visible' : 'hidden')}
        onClick={() => setMobileSidebarOpen(false)}
      >
        <aside
          className={clsx('sidebar-drawer', mobileSidebarOpen ? 'open' : 'closed')}
          onClick={(e) => e.stopPropagation()}
        >
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
          <SidebarContent collapsed={false} onItemClick={handleMobileItemClick} />
        </aside>
      </div>
    </>
  )
}
