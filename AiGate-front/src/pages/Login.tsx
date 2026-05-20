import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, Role } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Moon, Sun, Monitor, AlertTriangle, Building2, Lock, Mail } from 'lucide-react'

const LOGIN_TABS = [
  { id: 'password', label: '密码登录', icon: <Lock size={16} /> },
  { id: 'email', label: '邮箱验证码', icon: <Mail size={16} /> },
  { id: 'sso', label: 'SSO 登录', icon: <Building2 size={16} /> },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('password')
  const [selectedRole, setSelectedRole] = useState<Role>('sys_admin')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    setTimeout(() => {
      const mockUsers: Record<Role, { name: string; tenantName: string }> = {
        sys_admin: { name: '张三', tenantName: '北京研发中心' },
        tenant_admin: { name: '李四', tenantName: '上海分公司' },
        dept_lead: { name: '王五', tenantName: 'AI 架构部' },
        project_lead: { name: '赵六', tenantName: 'AiGate 项目组' },
        user: { name: '钱七', tenantName: '开发团队' },
      }

      const user = mockUsers[selectedRole]
      login(
        { id: '1', name: user.name, email: `${user.name}@aigate.com`, role: selectedRole, tenantId: '1', tenantName: user.tenantName },
        'mock-token'
      )

      // Role-based routing
      if (selectedRole === 'user') {
        navigate('/workspace')
      } else {
        navigate('/dashboard')
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-body)' }}>
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto flex items-center justify-center font-bold text-2xl mb-4" style={{ background: 'var(--brand-main)', color: 'var(--bg-body)', borderRadius: 'var(--border-radius-base)' }}>A</div>
          <h1 className="text-2xl font-bold">AiGate</h1>
          <p className="text-secondary mt-2">企业级 AI 全栈管控平台</p>
        </div>

        {/* Login method tabs */}
        <Tabs tabs={LOGIN_TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)', color: 'var(--error)' }}>
            <AlertTriangle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Password login */}
        {activeTab === 'password' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="邮箱" type="email" placeholder="请输入邮箱" required />
            <Input label="密码" type="password" placeholder="请输入密码" required />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-secondary">
                <input type="checkbox" className="accent-[var(--brand-main)]" /> 记住登录
              </label>
              <a href="#" className="text-brand-main hover:underline">忘记密码?</a>
            </div>
            <Button type="submit" variant="primary" className="w-full" loading={loading}>登录</Button>
          </form>
        )}

        {/* Email login */}
        {activeTab === 'email' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="邮箱" type="email" placeholder="请输入邮箱" required />
            <div className="flex gap-2">
              <Input label="验证码" type="text" placeholder="请输入验证码" required />
              <Button variant="secondary" className="mt-6 whitespace-nowrap">发送验证码</Button>
            </div>
            <Button type="submit" variant="primary" className="w-full" loading={loading}>登录</Button>
          </form>
        )}

        {/* SSO login */}
        {activeTab === 'sso' && (
          <div className="space-y-3">
            <p className="text-sm text-secondary text-center mb-4">选择企业 SSO 方式登录</p>
            <Button variant="secondary" className="w-full" icon={<Building2 size={16} />}>企业微信登录</Button>
            <Button variant="secondary" className="w-full" icon={<Building2 size={16} />}>钉钉登录</Button>
            <Button variant="secondary" className="w-full" icon={<Lock size={16} />}>LDAP 登录</Button>
            <Button variant="secondary" className="w-full" icon={<Lock size={16} />}>OIDC 登录</Button>
          </div>
        )}

        {/* Role selector (demo only) */}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs text-secondary text-center mb-2">演示模式 - 选择角色</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {(['sys_admin', 'tenant_admin', 'dept_lead', 'project_lead', 'user'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedRole === role ? 'text-white' : 'text-secondary'}`}
                style={{ backgroundColor: selectedRole === role ? 'var(--brand-main)' : 'var(--bg-elevated)' }}
              >
                {role === 'sys_admin' ? 'SYS' : role === 'tenant_admin' ? 'TENANT' : role === 'dept_lead' ? 'DEPT' : role === 'project_lead' ? 'PROJ' : 'USER'}
              </button>
            ))}
          </div>
        </div>

        {/* Theme switcher */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => setTheme('dark')} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-elevated' : ''}`}><Moon size={18} /></button>
          <button onClick={() => setTheme('light')} className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-elevated' : ''}`}><Sun size={18} /></button>
          <button onClick={() => setTheme('apple')} className={`p-2 rounded-lg transition-colors ${theme === 'apple' ? 'bg-elevated' : ''}`}><Monitor size={18} /></button>
        </div>
      </div>
    </div>
  )
}
