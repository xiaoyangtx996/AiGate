import { useState, useMemo } from 'react'
import { Key, Plus, Copy, Settings, Trash2, RefreshCw, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { Timeline, TimelineStatus } from '@/components/ui/Timeline'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KeyItem {
  id: string
  name: string
  keyPreview: string
  keyFull: string
  env: 'PROD' | 'DEV'
  expiry: string
  expiryWarning?: string
  status: 'active' | 'expired' | 'revoked' | 'rate_limited'
  calls: number
  cost: number
  dailyLimit?: number
  ipWhitelist?: string[]
  models: { name: string; authorized: boolean }[]
  owner: string
  department: string
  createdAt: string
  lastUsedAt?: string
  timeline: {
    id: string
    title: string
    time: string
    status: TimelineStatus
    description?: string
  }[]
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_KEYS: KeyItem[] = [
  {
    id: '1',
    name: 'Cursor 专用',
    keyPreview: 'ag-prod-8f2c...e1b9',
    keyFull: 'ag-prod-8f2c-8f2c-e1b9-4a5b-6c7d-8e9f',
    env: 'PROD',
    expiry: '2026-12-31',
    status: 'active',
    calls: 14205,
    cost: 342.80,
    dailyLimit: 10000,
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
    models: [
      { name: 'gpt-4o', authorized: true },
      { name: 'claude-3-5-sonnet', authorized: true },
      { name: 'gemini-1.5-pro', authorized: true },
      { name: 'dall-e-3', authorized: false },
    ],
    owner: '张三',
    department: 'AI 架构部',
    createdAt: '2026-01-15',
    lastUsedAt: '2026-05-20 14:30',
    timeline: [
      { id: '1', title: '创建密钥', time: '2026-01-15 10:00', status: 'success', description: '由张三创建，PROD 环境' },
      { id: '2', title: '启用', time: '2026-01-15 10:01', status: 'success', description: '密钥激活成功' },
      { id: '3', title: '配置 IP 白名单', time: '2026-02-20 15:30', status: 'success', description: '添加 192.168.1.0/24' },
      { id: '4', title: '使用中', time: '2026-05-20', status: 'active', description: '累计调用 14,205 次' },
      { id: '5', title: '到期', time: '2026-12-31', status: 'pending', description: '预计到期时间' },
    ],
  },
  {
    id: '2',
    name: '测试自动化 Key',
    keyPreview: 'ag-dev-3a1b...9c8d',
    keyFull: 'ag-dev-3a1b-3a1b-9c8d-0e1f-2a3b-4c5d',
    env: 'DEV',
    expiry: '2026-05-23',
    expiryWarning: '即将过期 (3天)',
    status: 'active',
    calls: 4812,
    cost: 24.15,
    dailyLimit: 5000,
    models: [
      { name: 'gpt-4o', authorized: true },
      { name: 'claude-3-5-sonnet', authorized: true },
    ],
    owner: '李四',
    department: '前端开发组',
    createdAt: '2026-04-01',
    lastUsedAt: '2026-05-20 10:15',
    timeline: [
      { id: '1', title: '创建密钥', time: '2026-04-01 09:00', status: 'success' },
      { id: '2', title: '启用', time: '2026-04-01 09:01', status: 'success' },
      { id: '3', title: '使用中', time: '2026-05-20', status: 'active' },
      { id: '4', title: '即将过期', time: '2026-05-23', status: 'error', description: '剩余 3 天' },
    ],
  },
  {
    id: '3',
    name: '已停用密钥',
    keyPreview: 'ag-prod-5e6f...7a8b',
    keyFull: 'ag-prod-5e6f-5e6f-7a8b-9c0d-1e2f-3a4b',
    env: 'PROD',
    expiry: '2026-03-15',
    status: 'revoked',
    calls: 8920,
    cost: 156.40,
    models: [
      { name: 'gpt-4o', authorized: true },
    ],
    owner: '王五',
    department: '产品部',
    createdAt: '2025-12-01',
    timeline: [
      { id: '1', title: '创建密钥', time: '2025-12-01 14:00', status: 'success' },
      { id: '2', title: '启用', time: '2025-12-01 14:01', status: 'success' },
      { id: '3', title: '使用中', time: '2026-03-10', status: 'active' },
      { id: '4', title: '吊销', time: '2026-03-15 16:30', status: 'error', description: '员工离职，自动吊销' },
    ],
  },
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  active: { label: '正常', variant: 'success' },
  expired: { label: '已过期', variant: 'error' },
  revoked: { label: '已吊销', variant: 'neutral' },
  rate_limited: { label: '已限速', variant: 'warning' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Keys() {
  const { addToast } = useUIStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<KeyItem | null>(null)
  const [search, setSearch] = useState('')
  const [envFilter, setEnvFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [confirmAction, setConfirmAction] = useState<{ type: string; keyId?: string } | null>(null)
  const [newIp, setNewIp] = useState('')

  // Filter keys
  const filteredKeys = useMemo(() => {
    return MOCK_KEYS.filter((key) => {
      const matchesSearch = !search || key.name.toLowerCase().includes(search.toLowerCase()) || key.keyPreview.includes(search)
      const matchesEnv = envFilter === 'all' || key.env === envFilter
      const matchesStatus = statusFilter === 'all' || key.status === statusFilter
      return matchesSearch && matchesEnv && matchesStatus
    })
  }, [search, envFilter, statusFilter])

  // Open drawer
  const handleOpenDrawer = (key: KeyItem) => {
    setSelectedKey(key)
    setDrawerOpen(true)
  }

  // Copy key
  const handleCopyKey = (keyFull: string) => {
    navigator.clipboard.writeText(keyFull)
    addToast({ type: 'success', title: '复制成功', message: '密钥已复制到剪贴板' })
  }

  // Revoke key
  const handleRevoke = (keyId: string) => {
    setConfirmAction({ type: 'revoke', keyId })
  }

  // Confirm action
  const handleConfirmAction = () => {
    if (!confirmAction) return
    addToast({ type: 'success', title: '操作成功' })
    setConfirmAction(null)
    setDrawerOpen(false)
  }

  // Add IP to whitelist
  const handleAddIp = () => {
    if (!newIp.trim()) return
    addToast({ type: 'success', title: '添加成功', message: `IP ${newIp} 已添加到白名单` })
    setNewIp('')
  }

  // Format number
  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  return (
    <div>
      <PageHeader
        title="密钥与凭证"
        subtitle="管理 API Key 访问凭证（格式: ag-{env}-{hex}），员工持有上限 3 个。"
        breadcrumbs={[{ label: '网关接入' }, { label: '密钥管理' }]}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            生成新密钥
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        {/* Filter Bar */}
        <div
          className="p-4 border-b flex flex-wrap gap-4 items-center"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="w-64">
            <Input
              placeholder="搜索密钥名称或前缀..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-32"
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
          >
            <option value="all">全部环境</option>
            <option value="PROD">生产 (PROD)</option>
            <option value="DEV">开发 (DEV)</option>
          </select>
          <select
            className="input w-32"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">正常</option>
            <option value="expired">已过期</option>
            <option value="revoked">已吊销</option>
            <option value="rate_limited">已限速</option>
          </select>
          <div className="ml-auto text-sm text-secondary">
            共 {filteredKeys.length} 个密钥
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="border-b" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">密钥别名 / Key</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">环境</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">所属人</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">调用统计</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">到期时间</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">状态</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredKeys.map((key) => {
                const statusConfig = STATUS_CONFIG[key.status]
                return (
                  <tr
                    key={key.id}
                    className="border-b transition-colors hover:bg-elevated cursor-pointer"
                    style={{ borderColor: 'var(--border-color)' }}
                    onClick={() => handleOpenDrawer(key)}
                  >
                    <td className="p-4 font-mono text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Key size={14} className="text-secondary" />
                        <span className="font-sans font-bold">{key.name}</span>
                      </div>
                      <span className={key.env === 'PROD' ? 'text-brand-main' : 'text-secondary'}>
                        {key.keyPreview}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={key.env === 'PROD' ? 'success' : 'warning'}>{key.env}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{key.owner}</div>
                      <div className="text-xs text-secondary">{key.department}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono">{formatNumber(key.calls)} 次</div>
                      <div className="text-xs text-secondary">¥ {key.cost.toFixed(2)}</div>
                    </td>
                    <td className="p-4">
                      {key.expiryWarning ? (
                        <span className="text-brand-accent font-bold text-xs">{key.expiryWarning}</span>
                      ) : (
                        <span className="text-secondary">{key.expiry}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-elevated transition-colors"
                          title="复制前缀"
                          onClick={() => handleCopyKey(key.keyPreview)}
                        >
                          <Copy size={14} className="text-secondary" />
                        </button>
                        {key.status === 'active' && (
                          <>
                            <button
                              className="p-1.5 rounded hover:bg-elevated transition-colors"
                              title="续期"
                            >
                              <RefreshCw size={14} className="text-secondary" />
                            </button>
                            <button
                              className="p-1.5 rounded transition-colors"
                              style={{ '--hover-bg': 'color-mix(in srgb, var(--error) 10%, transparent)' } as React.CSSProperties}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--error) 10%, transparent)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                              title="吊销"
                              onClick={() => handleRevoke(key.id)}
                            >
                              <Trash2 size={14} style={{ color: 'var(--error)' }} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredKeys.length === 0 && (
          <EmptyState
            icon={Key}
            title="暂无密钥"
            description={search || envFilter !== 'all' || statusFilter !== 'all' ? '没有匹配的密钥' : '您还没有创建任何 API Key'}
            action={
              !search && envFilter === 'all' && statusFilter === 'all'
                ? { label: '生成第一个密钥', onClick: () => setModalOpen(true) }
                : undefined
            }
          />
        )}
      </Card>

      {/* Create Key Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="生成新 API Key"
        description="创建新的 API Key 用于访问 AiGate 网关"
      >
        <div className="space-y-4">
          <Input label="用途名称" placeholder="例如：自动化测试脚本使用" required />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              作用环境
            </label>
            <select className="input">
              <option value="DEV">开发环境 (DEV)</option>
              <option value="PROD">生产环境 (PROD)</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              有效时长
            </label>
            <select className="input">
              <option>30 天</option>
              <option>90 天 (推荐)</option>
              <option>365 天</option>
              <option>永久有效 (需审批)</option>
            </select>
          </div>
          <Input label="每日调用上限" type="number" placeholder="10000" />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              允许的模型
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'deepseek-coder'].map((model) => (
                <label key={model} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[var(--brand-main)]" />
                  <span className="text-sm">{model}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={() => {
            addToast({ type: 'success', title: '生成成功', message: '新密钥已创建，请妥善保管' })
            setModalOpen(false)
          }}>
            立即生成
          </Button>
        </div>
      </Modal>

      {/* Key Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedKey?.name ?? '密钥详情'}
        width="md"
      >
        {selectedKey && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Badge variant={selectedKey.env === 'PROD' ? 'success' : 'warning'} size="md">
                {selectedKey.env}
              </Badge>
              <Badge variant={STATUS_CONFIG[selectedKey.status].variant}>
                {STATUS_CONFIG[selectedKey.status].label}
              </Badge>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">
                密钥密匙 (Secret Key)
              </label>
              <div
                className="flex items-center gap-2 p-3 rounded-lg border font-mono text-xs text-brand-main"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <span className="flex-1 break-all">{selectedKey.keyFull}</span>
                <button
                  onClick={() => handleCopyKey(selectedKey.keyFull)}
                  className="text-secondary hover:text-brand-main transition-colors cursor-pointer flex-shrink-0"
                  title="复制密钥"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
                <div className="text-secondary text-xs">累计调用</div>
                <div className="text-lg font-bold mt-1">{selectedKey.calls.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
                <div className="text-secondary text-xs">本月消耗</div>
                <div className="text-lg font-bold mt-1">¥ {selectedKey.cost.toFixed(2)}</div>
              </div>
            </div>

            {/* Info */}
            <Card>
              <h4 className="font-bold mb-3">基本信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">所属人</span>
                  <span>{selectedKey.owner} / {selectedKey.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">创建时间</span>
                  <span>{selectedKey.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">最后使用</span>
                  <span>{selectedKey.lastUsedAt || '从未使用'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">到期时间</span>
                  <span className={selectedKey.expiryWarning ? 'text-brand-accent font-bold' : ''}>
                    {selectedKey.expiryWarning || selectedKey.expiry}
                  </span>
                </div>
                {selectedKey.dailyLimit && (
                  <div className="flex justify-between">
                    <span className="text-secondary">每日上限</span>
                    <span>{selectedKey.dailyLimit.toLocaleString()} 次</span>
                  </div>
                )}
              </div>
            </Card>

            {/* IP Whitelist */}
            <Card>
              <h4 className="font-bold mb-3">IP 白名单</h4>
              <p className="text-xs text-secondary mb-3">仅允许以下 IP 地址访问，留空表示不限制</p>
              <div className="space-y-2 mb-3">
                {selectedKey.ipWhitelist?.map((ip, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded border text-sm font-mono"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <span>{ip}</span>
                    <button style={{ color: 'var(--error)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(!selectedKey.ipWhitelist || selectedKey.ipWhitelist.length === 0) && (
                  <p className="text-sm text-secondary">未配置 IP 白名单（不限制访问来源）</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="输入 IP 或 CIDR，如 192.168.1.0/24"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                />
                <Button variant="secondary" onClick={handleAddIp}>添加</Button>
              </div>
            </Card>

            {/* Authorized Models */}
            <Card>
              <h4 className="font-bold mb-3">授权模型</h4>
              <div className="flex flex-wrap gap-2">
                {selectedKey.models.map((model) =>
                  model.authorized ? (
                    <Badge key={model.name} variant="success">{model.name}</Badge>
                  ) : (
                    <Badge key={model.name} variant="neutral">{model.name} (未授权)</Badge>
                  )
                )}
              </div>
            </Card>

            {/* Lifecycle Timeline */}
            <Card>
              <h4 className="font-bold mb-3">生命周期</h4>
              <Timeline items={selectedKey.timeline} />
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" icon={<RefreshCw size={16} />}>
                续期
              </Button>
              <Button variant="secondary" className="flex-1" icon={<Settings size={16} />}>
                编辑配置
              </Button>
            </div>
            {selectedKey.status === 'active' && (
              <Button
                variant="danger"
                className="w-full"
                icon={<Trash2 size={16} />}
                onClick={() => handleRevoke(selectedKey.id)}
              >
                吊销密钥
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title="确认吊销密钥"
        description="吊销后密钥将立即失效，使用该密钥的所有应用将无法访问。此操作不可撤销。"
        variant="danger"
        confirmText="确认吊销"
        requireConfirmWord="REVOKE"
      />
    </div>
  )
}
