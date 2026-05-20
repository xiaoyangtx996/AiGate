import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Key,
  BarChart3,
  Bell,
  Shield,
  Save,
  Copy,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  Camera,
  Smartphone,
  Mail,
  Globe,
  Clock,
  Monitor,
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  LogOut,
  Lock,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApiKeyItem {
  id: string
  name: string
  keyPreview: string
  keyFull: string
  env: 'PROD' | 'DEV' | 'STG'
  status: 'active' | 'expiring' | 'expired' | 'revoked'
  expiry: string
  expiryDays?: number
  callsThisMonth: number
  costThisMonth: number
  models: string[]
  createdAt: string
}

interface LoginHistoryItem {
  id: string
  time: string
  ip: string
  location: string
  device: string
  browser: string
  status: 'success' | 'failed'
  isCurrentSession?: boolean
}

interface NotificationRule {
  id: string
  type: string
  description: string
  email: boolean
  systemNotify: boolean
  sms: boolean
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_KEYS: ApiKeyItem[] = [
  {
    id: '1',
    name: 'Cursor Copilot',
    keyPreview: 'ag-prod-8f2c...e19b',
    keyFull: 'ag-prod-8f2ca374d858c8a147e8c39e19b',
    env: 'PROD',
    status: 'active',
    expiry: '2026-12-31',
    callsThisMonth: 8420,
    costThisMonth: 186.50,
    models: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'],
    createdAt: '2026-01-15',
  },
  {
    id: '2',
    name: 'DEV_API_Key',
    keyPreview: 'ag-dev-a1b2...c3d4',
    keyFull: 'ag-dev-a1b2c3d4e5f678901234567890b',
    env: 'DEV',
    status: 'expiring',
    expiry: '2026-05-23',
    expiryDays: 3,
    callsThisMonth: 1240,
    costThisMonth: 12.30,
    models: ['gpt-4o', 'claude-3-5-sonnet'],
    createdAt: '2026-04-01',
  },
]

const MOCK_USAGE = {
  tokenUsed: 120000,
  tokenLimit: 2000000,
  costUsed: 248.5,
  costLimit: 500.0,
  dailyTrend: [
    { date: '05-14', tokens: 3200, cost: 8.2 },
    { date: '05-15', tokens: 5100, cost: 12.5 },
    { date: '05-16', tokens: 2800, cost: 6.8 },
    { date: '05-17', tokens: 7600, cost: 18.3 },
    { date: '05-18', tokens: 4500, cost: 10.9 },
    { date: '05-19', tokens: 6200, cost: 15.1 },
    { date: '05-20', tokens: 3800, cost: 9.2 },
  ],
  topModels: [
    { name: 'claude-3-5-sonnet', calls: 4820, tokens: 58000, percent: 48 },
    { name: 'gpt-4o', calls: 3100, tokens: 42000, percent: 35 },
    { name: 'gemini-1.5-pro', calls: 980, tokens: 20000, percent: 17 },
  ],
  topAgents: [
    { name: '后端代码助手', calls: 2100, tokens: 35000 },
    { name: '销售知识 Bot', calls: 1400, tokens: 22000 },
    { name: 'SQL 调优专家', calls: 800, tokens: 15000 },
  ],
}

const MOCK_LOGIN_HISTORY: LoginHistoryItem[] = [
  { id: '1', time: '2026-05-20 14:30', ip: '192.168.1.105', location: '北京', device: 'MacBook Pro', browser: 'Chrome 126', status: 'success', isCurrentSession: true },
  { id: '2', time: '2026-05-20 09:15', ip: '192.168.1.105', location: '北京', device: 'MacBook Pro', browser: 'Chrome 126', status: 'success' },
  { id: '3', time: '2026-05-19 18:42', ip: '10.0.0.52', location: '北京', device: 'iPhone 15', browser: 'Safari 19', status: 'success' },
  { id: '4', time: '2026-05-18 22:10', ip: '203.119.45.88', location: '上海', device: 'Windows PC', browser: 'Edge 126', status: 'failed' },
  { id: '5', time: '2026-05-18 10:05', ip: '192.168.1.105', location: '北京', device: 'MacBook Pro', browser: 'Chrome 126', status: 'success' },
  { id: '6', time: '2026-05-17 08:30', ip: '192.168.1.105', location: '北京', device: 'MacBook Pro', browser: 'Chrome 126', status: 'success' },
]

const MOCK_NOTIFICATIONS: NotificationRule[] = [
  { id: '1', type: '配额 70% 预警', description: '个人配额使用达到 70% 时通知', email: true, systemNotify: true, sms: false },
  { id: '2', type: '配额 90% 预警', description: '个人配额使用达到 90% 时通知', email: true, systemNotify: true, sms: true },
  { id: '3', type: '配额耗尽', description: '个人配额已完全耗尽', email: true, systemNotify: true, sms: true },
  { id: '4', type: '密钥即将过期', description: '密钥剩余 7 天内到期', email: true, systemNotify: true, sms: false },
  { id: '5', type: '密钥已过期', description: '密钥已过期无法使用', email: true, systemNotify: true, sms: true },
  { id: '6', type: '异常调用检测', description: '调用频率异常升高 5 倍以上', email: true, systemNotify: true, sms: true },
  { id: '7', type: 'MCP 工具不可用', description: '已授权的 MCP 工具健康检查失败', email: false, systemNotify: true, sms: false },
  { id: '8', type: 'Agent 调用异常', description: 'Agent 调用失败率异常升高', email: false, systemNotify: true, sms: false },
  { id: '9', type: '知识库处理完成', description: '文档向量化处理完成通知', email: false, systemNotify: true, sms: false },
  { id: '10', type: '权限变更', description: '你的角色或权限被管理员修改', email: true, systemNotify: true, sms: false },
  { id: '11', type: '新 Agent 可用', description: '有新的 Agent 对你开放使用', email: false, systemNotify: true, sms: false },
  { id: '12', type: '系统维护通知', description: '平台计划维护或升级通知', email: true, systemNotify: true, sms: false },
]

const ENV_BADGE: Record<string, { variant: 'success' | 'warning' | 'info' }> = {
  PROD: { variant: 'success' },
  DEV: { variant: 'warning' },
  STG: { variant: 'info' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile')

  /* -- Profile form state -- */
  const [name, setName] = useState('张三')
  const [email, setEmail] = useState('zhangsan@company.com')
  const [phone, setPhone] = useState('138****5678')
  const [timezone, setTimezone] = useState('Asia/Shanghai')
  const [language, setLanguage] = useState('zh-CN')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  /* -- Keys state -- */
  const [keys, setKeys] = useState<ApiKeyItem[]>(MOCK_KEYS)
  const [keyDrawerOpen, setKeyDrawerOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKeyItem | null>(null)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null)

  /* -- Notifications state -- */
  const [notifications, setNotifications] = useState<NotificationRule[]>(MOCK_NOTIFICATIONS)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('08:00')
  const [summaryFrequency, setSummaryFrequency] = useState('daily')

  /* -- Security state -- */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = useState(false)

  /* -- Computed -- */
  const usedQuotaPercent = useMemo(
    () => ((MOCK_USAGE.costUsed / MOCK_USAGE.costLimit) * 100).toFixed(1),
    [],
  )
  const tokenPercent = useMemo(
    () => ((MOCK_USAGE.tokenUsed / MOCK_USAGE.tokenLimit) * 100).toFixed(1),
    [],
  )
  const maxTrendTokens = useMemo(
    () => Math.max(...MOCK_USAGE.dailyTrend.map((d) => d.tokens)),
    [],
  )

  /* -- Handlers -- */
  const handleCopyKey = (fullKey: string) => {
    navigator.clipboard.writeText(fullKey)
  }

  const handleRevokeKey = (keyId: string) => {
    setKeyToRevoke(keyId)
    setRevokeConfirmOpen(true)
  }

  const confirmRevoke = () => {
    if (keyToRevoke) {
      setKeys((prev) => prev.filter((k) => k.id !== keyToRevoke))
    }
    setRevokeConfirmOpen(false)
    setKeyToRevoke(null)
    setSelectedKey(null)
  }

  const toggleNotification = (id: string, field: 'email' | 'systemNotify' | 'sms') => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [field]: !n[field] } : n)),
    )
  }

  const handleSaveProfile = () => {
    // placeholder for API call
  }

  const handleChangePassword = () => {
    // placeholder for API call
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  /* -- Tab definitions -- */
  const tabs = [
    { id: 'profile', label: '个人资料', icon: <User size={14} /> },
    { id: 'keys', label: '我的密钥', icon: <Key size={14} />, count: keys.length },
    { id: 'usage', label: '我的用量', icon: <BarChart3 size={14} /> },
    { id: 'notifications', label: '通知偏好', icon: <Bell size={14} /> },
    { id: 'security', label: '安全设置', icon: <Shield size={14} /> },
  ]

  return (
    <div>
      <PageHeader
        title="个人中心"
        subtitle="管理个人资料、密钥、用量与安全设置。"
        breadcrumbs={[{ label: '系统' }, { label: '个人中心' }]}
        actions={
          activeTab === 'profile' ? (
            <Button icon={<Save size={16} />} onClick={handleSaveProfile}>
              保存修改
            </Button>
          ) : undefined
        }
      />

      {/* Tab Navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* ============================================================ */}
      {/*  Tab: Profile                                                 */}
      {/* ============================================================ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Avatar Card */}
          <Card className="col-span-1 flex flex-col items-center text-center py-10">
            <div className="relative group">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black"
                style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  name.charAt(0)
                )}
              </div>
              <label
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="上传头像"
              >
                <Camera size={20} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              </label>
            </div>
            <div className="text-xl font-bold mt-4">{name}</div>
            <div className="text-secondary text-sm mt-1">{email}</div>
            <div className="mt-3">
              <Badge variant="success">普通成员</Badge>
            </div>
            <div className="mt-2 text-xs text-secondary">北京研发中心 / 架构组</div>

            <div
              className="mt-6 w-full border-t pt-6 space-y-3 text-left px-6"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-secondary">本月已用额度</span>
                <span className="font-bold">{'¥'} {MOCK_USAGE.costUsed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">个人配额上限</span>
                <span className="font-bold">{'¥'} {MOCK_USAGE.costLimit.toFixed(2)}</span>
              </div>
              <div
                className="h-2 rounded-full mt-1"
                style={{ background: 'var(--border-color)' }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${usedQuotaPercent}%`,
                    background: 'var(--brand-main)',
                  }}
                />
              </div>
              <div className="text-xs text-secondary text-right">已用 {usedQuotaPercent}%</div>
            </div>
          </Card>

          {/* Right: Form */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="p-6 space-y-5">
              <h3
                className="font-bold border-b pb-3 flex items-center gap-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <User size={18} style={{ color: 'var(--brand-main)' }} />
                基本信息
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div className="w-full">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    部门
                  </label>
                  <input
                    className="input w-full opacity-60 cursor-not-allowed"
                    value="北京研发中心 / 架构组"
                    readOnly
                    disabled
                  />
                  <p className="mt-1 text-xs text-secondary">由组织架构决定，不可自行修改</p>
                </div>
                <Input
                  label="邮箱"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={16} />}
                  required
                />
                <Input
                  label="手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  icon={<Smartphone size={16} />}
                />
              </div>
            </Card>

            {/* Preferences */}
            <Card className="p-6 space-y-5">
              <h3
                className="font-bold border-b pb-3 flex items-center gap-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Globe size={18} style={{ color: 'var(--brand-main)' }} />
                偏好设置
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="w-full">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    时区
                  </label>
                  <select
                    className="input w-full"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    语言
                  </label>
                  <select
                    className="input w-full"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Organization Info (Read-only) */}
            <Card className="p-6 space-y-4">
              <h3
                className="font-bold border-b pb-3 flex items-center gap-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <MapPin size={18} style={{ color: 'var(--brand-main)' }} />
                组织归属
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: '集团', value: 'XYTX 集团' },
                  { label: '分公司', value: '北京研发中心' },
                  { label: '部门', value: '架构组' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-xs text-secondary">{item.label}</div>
                    <div className="font-medium text-sm mt-1">{item.value}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-secondary">
                组织归属由管理员分配，如需变更请联系部门负责人或 IT 管理员。
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Tab: My Keys                                                 */}
      {/* ============================================================ */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          {/* Header info */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary">
              活跃密钥 <span className="font-bold text-primary">{keys.filter((k) => k.status === 'active' || k.status === 'expiring').length}</span> / 3
            </div>
            {keys.filter((k) => k.status === 'active' || k.status === 'expiring').length < 3 && (
              <Button size="sm" icon={<Plus size={14} />}>
                创建新密钥
              </Button>
            )}
          </div>

          {/* Key Cards */}
          {keys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keys.map((key) => (
                <Card
                  key={key.id}
                  className="p-5 hover:border-brand-main transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedKey(key)
                    setKeyDrawerOpen(true)
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'color-mix(in srgb, var(--brand-main) 15%, transparent)' }}
                      >
                        <Key size={16} style={{ color: 'var(--brand-main)' }} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{key.name}</div>
                        <Badge variant={ENV_BADGE[key.env]?.variant ?? 'neutral'} size="sm">
                          {key.env}
                        </Badge>
                      </div>
                    </div>
                    <Badge
                      variant={
                        key.status === 'active'
                          ? 'success'
                          : key.status === 'expiring'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {key.status === 'active'
                        ? '正常'
                        : key.status === 'expiring'
                          ? '即将过期'
                          : key.status === 'expired'
                            ? '已过期'
                            : '已吊销'}
                    </Badge>
                  </div>

                  <div
                    className="flex items-center justify-between p-2.5 rounded border mb-3"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <code className="text-xs font-mono" style={{ color: 'var(--brand-main)' }}>
                      {key.keyPreview}
                    </code>
                    <button
                      className="text-secondary hover:text-brand-main transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyKey(key.keyFull)
                      }}
                      title="复制完整密钥"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">到期时间</span>
                      <span
                        className={
                          key.expiryDays !== undefined && key.expiryDays <= 7
                            ? 'text-brand-accent font-bold'
                            : ''
                        }
                      >
                        {key.expiry}
                        {key.expiryDays !== undefined && key.expiryDays <= 7 && (
                          <span className="ml-1">({key.expiryDays}天)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">本月调用</span>
                      <span className="font-mono">{formatNumber(key.callsThisMonth)} 次</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">本月消耗</span>
                      <span className="font-mono">{'¥'} {key.costThisMonth.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {key.models.slice(0, 3).map((m) => (
                      <Badge key={m} variant="neutral" size="sm">
                        {m}
                      </Badge>
                    ))}
                    {key.models.length > 3 && (
                      <Badge variant="neutral" size="sm">+{key.models.length - 3}</Badge>
                    )}
                  </div>
                </Card>
              ))}

              {/* Empty slot */}
              {keys.filter((k) => k.status === 'active' || k.status === 'expiring').length < 3 && (
                <Card
                  className="p-5 flex flex-col items-center justify-center text-center min-h-[220px] border-dashed cursor-pointer hover:border-brand-main transition-colors"
                  onClick={() => {}}
                >
                  <Plus size={24} className="text-secondary mb-2" />
                  <div className="text-sm font-medium text-secondary">创建新密钥</div>
                  <div className="text-xs text-secondary mt-1">最多持有 3 个活跃密钥</div>
                </Card>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Key}
              title="暂无密钥"
              description="你还没有创建任何 API Key，创建一个开始使用。"
              action={{ label: '创建第一个密钥', onClick: () => {} }}
            />
          )}

          {/* Help hint */}
          <div
            className="flex items-start gap-3 p-4 rounded-lg border"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
          >
            <AlertTriangle size={16} className="text-brand-accent flex-shrink-0 mt-0.5" />
            <div className="text-xs text-secondary">
              密钥格式为 <code className="font-mono text-brand-main">ag-{'{'}env{'}'}-{'{'}hex{'}'}</code>，
              请妥善保管。如需在 Cursor、Cherry Studio 等工具中使用，请参考{' '}
              <Link to="/developer" className="text-brand-main hover:underline">
                开发者接入指南
              </Link>
              。
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Tab: My Usage                                                */}
      {/* ============================================================ */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className="p-5"
              style={{ borderTop: '4px solid var(--brand-main)' }}
            >
              <div className="text-xs text-secondary font-bold uppercase tracking-widest mb-2">
                本月 Token 用量
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatNumber(MOCK_USAGE.tokenUsed)}</span>
                <span className="text-secondary text-sm">/ {formatNumber(MOCK_USAGE.tokenLimit)}</span>
              </div>
              <div
                className="h-2 rounded-full mt-3"
                style={{ background: 'var(--border-color)' }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${tokenPercent}%`, background: 'var(--brand-main)' }}
                />
              </div>
              <div className="text-xs text-secondary mt-2">消耗占比 {tokenPercent}%</div>
            </Card>

            <Card className="p-5">
              <div className="text-xs text-secondary font-bold uppercase tracking-widest mb-2">
                本月费用
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{'¥'} {MOCK_USAGE.costUsed.toFixed(2)}</span>
                <span className="text-secondary text-sm">/ {'¥'} {MOCK_USAGE.costLimit.toFixed(2)}</span>
              </div>
              <div
                className="h-2 rounded-full mt-3"
                style={{ background: 'var(--border-color)' }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${usedQuotaPercent}%`, background: 'var(--brand-main)' }}
                />
              </div>
              <div className="text-xs text-secondary mt-2">
                剩余额度 {'¥'} {(MOCK_USAGE.costLimit - MOCK_USAGE.costUsed).toFixed(2)}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs text-secondary font-bold uppercase tracking-widest mb-2">
                活跃密钥
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{keys.filter((k) => k.status === 'active' || k.status === 'expiring').length}</span>
                <span className="text-secondary text-sm">/ 3</span>
              </div>
              <div className="text-xs text-secondary mt-3">
                本月总调用 {formatNumber(keys.reduce((s, k) => s + k.callsThisMonth, 0))} 次
              </div>
            </Card>
          </div>

          {/* Daily Trend */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <TrendingUp size={18} style={{ color: 'var(--brand-main)' }} />
                  近 7 天调用趋势
                </h3>
                <p className="text-xs text-secondary mt-1">每日 Token 消耗量</p>
              </div>
            </div>
            {/* Simple bar chart */}
            <div className="flex items-end gap-3 h-40">
              {MOCK_USAGE.dailyTrend.map((day) => {
                const heightPercent = (day.tokens / maxTrendTokens) * 100
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-mono text-secondary">{formatNumber(day.tokens)}</div>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${heightPercent}%`,
                        background: 'var(--brand-main)',
                        minHeight: '4px',
                      }}
                    />
                    <div className="text-xs text-secondary">{day.date}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Top Models & Top Agents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} style={{ color: 'var(--brand-main)' }} />
                Top 调用模型
              </h3>
              <div className="space-y-4">
                {MOCK_USAGE.topModels.map((model, index) => (
                  <div key={model.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-secondary w-5">{index + 1}</span>
                        <span className="text-sm font-medium">{model.name}</span>
                      </div>
                      <span className="text-xs text-secondary font-mono">
                        {formatNumber(model.calls)} 次 / {formatNumber(model.tokens)} tokens
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full"
                      style={{ background: 'var(--border-color)' }}
                    >
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${model.percent}%`,
                          background: index === 0 ? 'var(--brand-main)' : index === 1 ? 'var(--brand-accent)' : 'var(--text-secondary)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} style={{ color: 'var(--brand-accent)' }} />
                Top 调用 Agent
              </h3>
              <div className="space-y-3">
                {MOCK_USAGE.topAgents.map((agent, index) => (
                  <div
                    key={agent.name}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: index === 0 ? 'var(--brand-main)' : 'var(--text-secondary)' }}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold">{formatNumber(agent.calls)} 次</div>
                      <div className="text-xs text-secondary">{formatNumber(agent.tokens)} tokens</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Apply for more */}
          <div
            className="flex items-center justify-between p-4 rounded-lg border"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-sm">
              需要更多配额？提交扩容申请，管理员审批后立即生效。
            </div>
            <Link to="/quota-approval">
              <Button size="sm" variant="secondary">
                申请扩容
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Tab: Notifications                                           */}
      {/* ============================================================ */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Notification Rules */}
          <Card className="p-0 overflow-hidden">
            <div
              className="p-4 border-b"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
            >
              <h3 className="font-bold flex items-center gap-2">
                <Bell size={18} style={{ color: 'var(--brand-main)' }} />
                预警通知配置
              </h3>
              <p className="text-xs text-secondary mt-1">
                配置各类预警事件的通知渠道。开启后将通过对应渠道接收通知。
              </p>
            </div>

            {/* Table Header */}
            <div
              className="grid grid-cols-12 gap-4 px-4 py-3 border-b text-xs font-bold text-secondary uppercase tracking-wider"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="col-span-5">预警类型</div>
              <div className="col-span-3 text-center">邮件</div>
              <div className="col-span-2 text-center">系统通知</div>
              <div className="col-span-2 text-center">短信</div>
            </div>

            {/* Notification Rows */}
            {notifications.map((rule) => (
              <div
                key={rule.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b items-center hover:bg-elevated transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="col-span-5">
                  <div className="text-sm font-medium">{rule.type}</div>
                  <div className="text-xs text-secondary">{rule.description}</div>
                </div>
                <div className="col-span-3 flex justify-center">
                  <button
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      rule.email ? '' : ''
                    }`}
                    style={{
                      background: rule.email ? 'var(--brand-main)' : 'var(--border-color)',
                    }}
                    onClick={() => toggleNotification(rule.id, 'email')}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ left: rule.email ? '18px' : '2px' }}
                    />
                  </button>
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    className="w-10 h-6 rounded-full transition-colors relative"
                    style={{
                      background: rule.systemNotify ? 'var(--brand-main)' : 'var(--border-color)',
                    }}
                    onClick={() => toggleNotification(rule.id, 'systemNotify')}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ left: rule.systemNotify ? '18px' : '2px' }}
                    />
                  </button>
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    className="w-10 h-6 rounded-full transition-colors relative"
                    style={{
                      background: rule.sms ? 'var(--brand-main)' : 'var(--border-color)',
                    }}
                    onClick={() => toggleNotification(rule.id, 'sms')}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ left: rule.sms ? '18px' : '2px' }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </Card>

          {/* Quiet Hours & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Clock size={18} style={{ color: 'var(--brand-main)' }} />
                静默时段
              </h3>
              <p className="text-xs text-secondary">
                在静默时段内，仅紧急预警（配额耗尽、密钥过期、异常调用）会发送通知。
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                    开始时间
                  </label>
                  <input
                    type="time"
                    className="input-base w-full"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                    结束时间
                  </label>
                  <input
                    type="time"
                    className="input-base w-full"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Mail size={18} style={{ color: 'var(--brand-main)' }} />
                摘要邮件
              </h3>
              <p className="text-xs text-secondary">
                选择接收预警摘要邮件的频率，汇总发送而非逐条通知。
              </p>
              <div className="space-y-2">
                {[
                  { value: 'off', label: '关闭' },
                  { value: 'daily', label: '每日汇总（每天 09:00 发送）' },
                  { value: 'weekly', label: '每周汇总（每周一 09:00 发送）' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-elevated transition-colors"
                    style={{ borderColor: summaryFrequency === option.value ? 'var(--brand-main)' : 'var(--border-color)' }}
                  >
                    <input
                      type="radio"
                      name="summary"
                      value={option.value}
                      checked={summaryFrequency === option.value}
                      onChange={(e) => setSummaryFrequency(e.target.value)}
                      className="accent-[var(--brand-main)]"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Tab: Security                                                */}
      {/* ============================================================ */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <Card className="p-6 space-y-5">
            <h3
              className="font-bold border-b pb-3 flex items-center gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Lock size={18} style={{ color: 'var(--brand-main)' }} />
              修改密码
            </h3>
            <div className="max-w-md space-y-4">
              <div className="relative">
                <Input
                  label="当前密码"
                  type={showCurrentPw ? 'text' : 'password'}
                  placeholder="输入当前密码"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 top-9 text-secondary hover:text-primary"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  type="button"
                >
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <Input
                  label="新密码"
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="至少 8 位，含大小写字母和数字"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 top-9 text-secondary hover:text-primary"
                  onClick={() => setShowNewPw(!showNewPw)}
                  type="button"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Input
                label="确认新密码"
                type="password"
                placeholder="再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={
                  confirmPassword && newPassword !== confirmPassword
                    ? '两次输入的密码不一致'
                    : undefined
                }
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
              >
                更新密码
              </Button>
            </div>
          </Card>

          {/* 2FA */}
          <Card className="p-6">
            <h3
              className="font-bold border-b pb-3 flex items-center gap-2 mb-5"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Shield size={18} style={{ color: 'var(--brand-main)' }} />
              两步验证 (2FA)
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    TOTP 验证器
                  </span>
                  <Badge variant={twoFAEnabled ? 'success' : 'neutral'}>
                    {twoFAEnabled ? '已启用' : '未启用'}
                  </Badge>
                </div>
                <p className="text-xs text-secondary mt-1">
                  使用 Google Authenticator 或其他 TOTP 应用进行二次验证，提升账号安全性。
                </p>
              </div>
              <Button
                variant={twoFAEnabled ? 'danger' : 'primary'}
                size="sm"
                onClick={() => setTwoFAEnabled(!twoFAEnabled)}
              >
                {twoFAEnabled ? '关闭 2FA' : '启用 2FA'}
              </Button>
            </div>
          </Card>

          {/* Login History */}
          <Card className="p-0 overflow-hidden">
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
            >
              <h3 className="font-bold flex items-center gap-2">
                <Monitor size={18} style={{ color: 'var(--brand-main)' }} />
                登录历史
              </h3>
              <span className="text-xs text-secondary">近 30 天记录</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead
                  className="text-xs text-secondary border-b"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                >
                  <tr>
                    <th className="p-3 pl-4">时间</th>
                    <th className="p-3">IP 地址</th>
                    <th className="p-3">位置</th>
                    <th className="p-3">设备</th>
                    <th className="p-3">浏览器</th>
                    <th className="p-3 text-center">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  {MOCK_LOGIN_HISTORY.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-elevated transition-colors ${item.isCurrentSession ? 'bg-brand-main/5' : ''}`}
                    >
                      <td className="p-3 pl-4 text-secondary text-xs">
                        {item.time}
                        {item.isCurrentSession && (
                          <Badge variant="success" size="sm" className="ml-2">
                            当前会话
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">{item.ip}</td>
                      <td className="p-3">{item.location}</td>
                      <td className="p-3">{item.device}</td>
                      <td className="p-3 text-secondary text-xs">{item.browser}</td>
                      <td className="p-3 text-center">
                        {item.status === 'success' ? (
                          <CheckCircle size={16} style={{ color: 'var(--brand-main)' }} className="inline" />
                        ) : (
                          <XCircle size={16} className="text-red-500 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Logout All Devices */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <LogOut size={18} className="text-red-500" />
                  登出所有其他设备
                </h3>
                <p className="text-xs text-secondary mt-1">
                  立即终止除当前会话外的所有登录会话。适用于怀疑账号被盗用的紧急情况。
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setLogoutAllConfirmOpen(true)}
              >
                全部登出
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Key Detail Drawer                                            */}
      {/* ============================================================ */}
      <Drawer
        isOpen={keyDrawerOpen}
        onClose={() => setKeyDrawerOpen(false)}
        title={selectedKey?.name ?? '密钥详情'}
        width="sm"
      >
        {selectedKey && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Badge variant={ENV_BADGE[selectedKey.env]?.variant ?? 'neutral'} size="md">
                {selectedKey.env}
              </Badge>
              <Badge
                variant={
                  selectedKey.status === 'active'
                    ? 'success'
                    : selectedKey.status === 'expiring'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {selectedKey.status === 'active'
                  ? '正常'
                  : selectedKey.status === 'expiring'
                    ? '即将过期'
                    : selectedKey.status === 'expired'
                      ? '已过期'
                      : '已吊销'}
              </Badge>
            </div>

            {/* Key display */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">
                密钥密匙
              </label>
              <div
                className="flex items-center gap-2 p-3 rounded-lg border font-mono text-xs"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <span className="flex-1 break-all" style={{ color: 'var(--brand-main)' }}>
                  {selectedKey.keyFull}
                </span>
                <button
                  onClick={() => handleCopyKey(selectedKey.keyFull)}
                  className="text-secondary hover:text-brand-main transition-colors flex-shrink-0"
                  title="复制密钥"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-3 rounded-lg border"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <div className="text-xs text-secondary">本月调用</div>
                <div className="text-lg font-bold mt-1">{formatNumber(selectedKey.callsThisMonth)}</div>
              </div>
              <div
                className="p-3 rounded-lg border"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <div className="text-xs text-secondary">本月消耗</div>
                <div className="text-lg font-bold mt-1">{'¥'} {selectedKey.costThisMonth.toFixed(2)}</div>
              </div>
            </div>

            {/* Info */}
            <Card>
              <h4 className="font-bold mb-3">基本信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">创建时间</span>
                  <span>{selectedKey.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">到期时间</span>
                  <span className={selectedKey.expiryDays !== undefined && selectedKey.expiryDays <= 7 ? 'text-brand-accent font-bold' : ''}>
                    {selectedKey.expiry}
                    {selectedKey.expiryDays !== undefined && selectedKey.expiryDays <= 7 && (
                      <span className="ml-1">({selectedKey.expiryDays}天)</span>
                    )}
                  </span>
                </div>
              </div>
            </Card>

            {/* Models */}
            <Card>
              <h4 className="font-bold mb-3">授权模型</h4>
              <div className="flex flex-wrap gap-2">
                {selectedKey.models.map((m) => (
                  <Badge key={m} variant="success">{m}</Badge>
                ))}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" icon={<RefreshCw size={16} />}>
                续期
              </Button>
              <Button variant="secondary" className="flex-1" icon={<Copy size={16} />}>
                复制前缀
              </Button>
            </div>
            {(selectedKey.status === 'active' || selectedKey.status === 'expiring') && (
              <Button
                variant="danger"
                className="w-full"
                icon={<Trash2 size={16} />}
                onClick={() => handleRevokeKey(selectedKey.id)}
              >
                吊销密钥
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirm Dialog: Revoke Key */}
      <ConfirmDialog
        isOpen={revokeConfirmOpen}
        onClose={() => setRevokeConfirmOpen(false)}
        onConfirm={confirmRevoke}
        title="确认吊销密钥"
        description="吊销后密钥将立即失效，使用该密钥的所有应用将无法访问。此操作不可撤销。"
        variant="danger"
        confirmText="确认吊销"
        requireConfirmWord="REVOKE"
      />

      {/* Confirm Dialog: Logout All */}
      <ConfirmDialog
        isOpen={logoutAllConfirmOpen}
        onClose={() => setLogoutAllConfirmOpen(false)}
        onConfirm={() => setLogoutAllConfirmOpen(false)}
        title="登出所有其他设备"
        description="此操作将终止除当前会话外的所有登录会话。其他设备上的用户将被强制重新登录。"
        variant="warning"
        confirmText="确认登出"
      />
    </div>
  )
}
