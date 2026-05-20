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
