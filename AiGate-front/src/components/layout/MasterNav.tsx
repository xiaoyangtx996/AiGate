import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Search, User, LogOut, Key, Moon, Sun, Monitor, Building2, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useUIStore } from '@/stores/ui'
import { Badge } from '@/components/ui/Badge'

export function MasterNav() {
  const { user, logout, simulatedRole, setSimulatedRole } = useAuth()
  const { theme, setTheme } = useTheme()
  const { setSearchOpen, setMobileSidebarOpen } = useUIStore()
  const navigate = useNavigate()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) setAvatarOpen(false)
      if (alertRef.current && !alertRef.current.contains(event.target as Node)) setAlertOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'apple', label: 'Apple', icon: Monitor },
  ]

  return (
    <header className="master-nav">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-elevated transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="打开侧边栏"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="flex items-center gap-3">
        <div
          className="w-8 h-8 flex items-center justify-center font-bold text-lg"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)', borderRadius: 'var(--border-radius-base)' }}
        >
          A
        </div>
        <span className="text-xl font-bold tracking-tight">
          AiGate <span className="text-secondary text-sm ml-1 font-normal">Enterprise</span>
        </span>
      </Link>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <Search size={16} />
          <span className="hidden md:inline">搜索</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-surface rounded" style={{ backgroundColor: 'var(--bg-surface)' }}>⌘K</kbd>
        </button>

        <div ref={alertRef} className="relative">
          <button onClick={() => setAlertOpen(!alertOpen)} className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-elevated transition-colors">
            <Bell size={18} className="text-secondary" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border border-surface" />
          </button>
          {alertOpen && (
            <div className="absolute right-0 mt-2 w-80 card p-0 shadow-dropdown z-50">
              <div className="p-4 border-b font-bold flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
                系统预警与通知 <Badge variant="warning">2</Badge>
              </div>
              <Link to="/alerts" className="p-3 text-center text-xs font-bold text-secondary hover:text-primary transition-colors" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                查看全部
              </Link>
            </div>
          )}
        </div>

        <div ref={avatarRef} className="relative">
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-8 h-8 border flex items-center justify-center text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--brand-main)', color: 'white', borderRadius: 'var(--border-radius-base)', borderColor: 'var(--border-color)' }}
          >
            {user?.name?.slice(0, 2) || 'AD'}
          </button>
          {avatarOpen && (
            <div className="absolute right-0 mt-2 w-64 card p-0 shadow-dropdown z-50">
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="font-bold">
                  {user?.name || '张三'} <Badge variant="info" size="sm">{simulatedRole?.toUpperCase() || 'SYS'}</Badge>
                </div>
                <div className="text-xs text-secondary mt-1">{user?.tenantName || '北京研发中心'}</div>
              </div>
              <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-elevated text-secondary hover:text-primary transition-colors" onClick={() => setAvatarOpen(false)}>
                  <User size={16} /> 个人资料
                </Link>
                <Link to="/keys" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-elevated text-secondary hover:text-primary transition-colors" onClick={() => setAvatarOpen(false)}>
                  <Key size={16} /> 我的密钥
                </Link>
              </div>
              <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between px-3 py-2 rounded-md text-secondary">
                  <div className="flex items-center gap-3"><Building2 size={16} /> 模拟角色</div>
                  <select value={simulatedRole || ''} onChange={(e) => setSimulatedRole(e.target.value as any || null)} className="bg-transparent border-none outline-none cursor-pointer font-bold text-xs">
                    <option value="">默认</option>
                    <option value="sys_admin">SYS</option>
                    <option value="tenant_admin">TENANT</option>
                    <option value="user">USER</option>
                  </select>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-md text-secondary">
                  <div className="flex items-center gap-3"><Monitor size={16} /> 主题</div>
                  <div className="flex gap-1 p-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as any)}
                        className={`px-2 py-0.5 text-xs font-bold rounded ${theme === option.value ? 'bg-surface' : ''}`}
                        style={{ backgroundColor: theme === option.value ? 'var(--bg-surface)' : undefined }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-500/10 text-red-500 transition-colors w-full">
                  <LogOut size={16} /> 退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
