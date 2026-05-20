import { useState, useMemo } from 'react'
import {
  Plug,
  Plus,
  Pencil,
  Search,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Gauge,
  Settings,
  Trash2,
  Shield,
  Activity,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OAuthAccount {
  id: string
  name: string
  email: string
  status: 'active' | 'expired' | 'error'
  lastUsedAt: string
  dailyCalls: number
}

interface RateLimitConfig {
  qps: number
  tpm: number
  rpm: number
  strategy: 'queue' | 'reject' | 'degrade'
}

interface ConnectivityTest {
  status: 'idle' | 'testing' | 'success' | 'error'
  latency?: number
  message?: string
  testedAt?: string
}

interface Channel {
  id: string
  name: string
  vendor: string
  vendorTag: string
  endpoint: string
  models: string[]
  priority: number
  weight: number
  qps: number
  latency: string
  latencyColor: 'green' | 'accent'
  status: 'enabled' | 'disabled'
  health: 'healthy' | 'degraded' | 'down'
  oauthPool: OAuthAccount[]
  rateLimit: RateLimitConfig
  connectivity: ConnectivityTest
  createdAt: string
  lastTestedAt?: string
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_CHANNELS: Channel[] = [
  {
    id: '1',
    name: 'Azure OpenAI',
    vendor: '微软',
    vendorTag: 'Microsoft',
    endpoint: 'https://hk-azure.openai.azure.com',
    models: ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-large'],
    priority: 1,
    weight: 60,
    qps: 50,
    latency: '24ms',
    latencyColor: 'green',
    status: 'enabled',
    health: 'healthy',
    oauthPool: [
      { id: 'o1', name: '主账号', email: 'admin@aigate.com', status: 'active', lastUsedAt: '2026-05-20 14:30', dailyCalls: 12500 },
      { id: 'o2', name: '备用账号 A', email: 'backup1@aigate.com', status: 'active', lastUsedAt: '2026-05-20 12:15', dailyCalls: 8200 },
      { id: 'o3', name: '备用账号 B', email: 'backup2@aigate.com', status: 'expired', lastUsedAt: '2026-05-18 09:00', dailyCalls: 0 },
    ],
    rateLimit: { qps: 50, tpm: 100000, rpm: 3000, strategy: 'queue' },
    connectivity: { status: 'success', latency: 24, message: '连接正常，API 响应正常', testedAt: '2026-05-20 14:35' },
    createdAt: '2025-12-01',
    lastTestedAt: '2026-05-20 14:35',
  },
  {
    id: '2',
    name: '智谱 AI 官方',
    vendor: 'Zhipu',
    vendorTag: 'Zhipu',
    endpoint: 'https://open.bigmodel.cn',
    models: ['glm-4', 'glm-4v', 'glm-4-flash'],
    priority: 2,
    weight: 30,
    qps: 30,
    latency: '158ms',
    latencyColor: 'accent',
    status: 'enabled',
    health: 'degraded',
    oauthPool: [
      { id: 'o4', name: '企业账号', email: 'enterprise@zhipu.com', status: 'active', lastUsedAt: '2026-05-20 13:45', dailyCalls: 5600 },
    ],
    rateLimit: { qps: 30, tpm: 60000, rpm: 2000, strategy: 'reject' },
    connectivity: { status: 'success', latency: 158, message: '连接正常，响应较慢', testedAt: '2026-05-20 14:35' },
    createdAt: '2026-01-15',
    lastTestedAt: '2026-05-20 14:35',
  },
  {
    id: '3',
    name: 'Anthropic Claude',
    vendor: 'Anthropic',
    vendorTag: 'Anthropic',
    endpoint: 'https://api.anthropic.com',
    models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    priority: 3,
    weight: 10,
    qps: 20,
    latency: '89ms',
    latencyColor: 'green',
    status: 'disabled',
    health: 'down',
    oauthPool: [],
    rateLimit: { qps: 20, tpm: 40000, rpm: 1000, strategy: 'reject' },
    connectivity: { status: 'error', message: '连接超时，请检查网络配置', testedAt: '2026-05-20 10:00' },
    createdAt: '2026-02-20',
    lastTestedAt: '2026-05-20 10:00',
  },
]

const HEALTH_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error'; icon: typeof Wifi }> = {
  healthy: { label: '健康', variant: 'success', icon: Wifi },
  degraded: { label: '降级', variant: 'warning', icon: Activity },
  down: { label: '不可用', variant: 'error', icon: WifiOff },
}

const CONNECTIVITY_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  idle: { label: '未测试', variant: 'neutral' },
  testing: { label: '测试中...', variant: 'warning' },
  success: { label: '连通', variant: 'success' },
  error: { label: '失败', variant: 'error' },
}

const STRATEGY_LABELS: Record<string, string> = {
  queue: '排队等待',
  reject: '直接拒绝',
  degrade: '降级处理',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Channels() {
  const { addToast } = useUIStore()
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [drawerTab, setDrawerTab] = useState<'info' | 'oauth' | 'rateLimit'>('info')
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [healthFilter, setHealthFilter] = useState<string>('all')

  // Filter channels
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      const matchesSearch =
        !search ||
        ch.name.toLowerCase().includes(search.toLowerCase()) ||
        ch.vendor.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || ch.status === statusFilter
      const matchesHealth = healthFilter === 'all' || ch.health === healthFilter
      return matchesSearch && matchesStatus && matchesHealth
    })
  }, [channels, search, statusFilter, healthFilter])

  // Open drawer
  const handleOpenDrawer = (channel: Channel) => {
    setSelectedChannel(channel)
    setDrawerTab('info')
    setDrawerOpen(true)
  }

  // Test connectivity
  const handleTestConnectivity = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === channelId ? { ...ch, connectivity: { ...ch.connectivity, status: 'testing' } } : ch
      )
    )

    // Simulate test
    setTimeout(() => {
      const latency = Math.floor(Math.random() * 200) + 10
      const success = Math.random() > 0.2

      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId
            ? {
                ...ch,
                connectivity: {
                  status: success ? 'success' : 'error',
                  latency: success ? latency : undefined,
                  message: success ? `连接正常，延迟 ${latency}ms` : '连接失败，请检查配置',
                  testedAt: new Date().toLocaleString('zh-CN'),
                },
                latency: success ? `${latency}ms` : ch.latency,
                latencyColor: success ? (latency < 100 ? 'green' : 'accent') : ch.latencyColor,
                lastTestedAt: new Date().toLocaleString('zh-CN'),
              }
            : ch
        )
      )

      addToast({
        type: success ? 'success' : 'error',
        title: success ? '连通性测试成功' : '连通性测试失败',
        message: success ? `延迟 ${latency}ms` : '请检查渠道配置',
      })
    }, 1500)
  }

  // Test all channels
  const handleTestAll = () => {
    channels.forEach((ch) => {
      if (ch.status === 'enabled') {
        handleTestConnectivity(ch.id)
      }
    })
  }

  // Toggle channel status
  const handleToggleStatus = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === channelId ? { ...ch, status: ch.status === 'enabled' ? 'disabled' : 'enabled' } : ch
      )
    )
    addToast({ type: 'success', title: '状态更新成功' })
  }

  return (
    <div>
      <PageHeader
        title="渠道管理"
        subtitle="配置上游供应商 API 代理及高可用负载均衡，支持连通性测试与限速策略。"
        breadcrumbs={[{ label: '网关接入' }, { label: '渠道管理' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Wifi size={16} />} onClick={handleTestAll}>
              全部测试
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              新增渠道
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">渠道总数</p>
              <p className="text-2xl font-bold mt-1">{channels.length}</p>
            </div>
            <Plug size={20} className="text-secondary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">健康渠道</p>
              <p className="text-2xl font-bold mt-1 text-[var(--brand-main)]">
                {channels.filter((c) => c.health === 'healthy').length}
              </p>
            </div>
            <CheckCircle size={20} className="text-[var(--brand-main)]" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">总 QPS</p>
              <p className="text-2xl font-bold mt-1">
                {channels.filter((c) => c.status === 'enabled').reduce((sum, c) => sum + c.qps, 0)}
              </p>
            </div>
            <Gauge size={20} className="text-secondary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">OAuth 账号</p>
              <p className="text-2xl font-bold mt-1">
                {channels.reduce((sum, c) => sum + c.oauthPool.length, 0)}
              </p>
            </div>
            <Users size={20} className="text-secondary" />
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {/* Filter Bar */}
        <div
          className="p-4 border-b flex flex-wrap gap-4 items-center"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="w-64">
            <Input
              placeholder="搜索渠道名称或厂商..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="enabled">启用</option>
            <option value="disabled">停用</option>
          </select>
          <select className="input w-32" value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}>
            <option value="all">全部健康</option>
            <option value="healthy">健康</option>
            <option value="degraded">降级</option>
            <option value="down">不可用</option>
          </select>
          <div className="ml-auto text-sm text-secondary">共 {filteredChannels.length} 个渠道</div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="border-b" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">渠道 / 厂商</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">支持模型</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">优先级</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">权重</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">QPS</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">延迟</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">健康状态</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">连通性</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">状态</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredChannels.map((channel) => {
                const healthConfig = HEALTH_CONFIG[channel.health]
                return (
                  <tr
                    key={channel.id}
                    className="border-b transition-colors hover:bg-elevated cursor-pointer"
                    style={{ borderColor: 'var(--border-color)' }}
                    onClick={() => handleOpenDrawer(channel)}
                  >
                    <td className="p-4">
                      <div className="font-bold flex items-center gap-2">
                        <Plug size={14} className="text-secondary" />
                        {channel.name}
                        <Badge variant="neutral" size="sm">
                          {channel.vendorTag}
                        </Badge>
                      </div>
                      <div className="text-xs text-secondary mt-1 font-mono">{channel.endpoint}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap w-48">
                        {channel.models.map((model) => (
                          <Badge key={model} variant="neutral" size="sm" className="border border-[var(--border-color)]">
                            {model}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold">{channel.priority}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-12 h-1.5 rounded-full bg-elevated overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--brand-main)]"
                            style={{ width: `${channel.weight}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{channel.weight}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono font-bold">{channel.qps}</td>
                    <td className="p-4 text-center font-mono">
                      <span
                        style={{
                          color:
                            channel.latencyColor === 'green' ? 'var(--brand-main)' : 'var(--brand-accent)',
                        }}
                      >
                        {channel.latency}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={healthConfig.variant} size="sm">
                        {healthConfig.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {channel.connectivity.status === 'testing' ? (
                        <Loader2 size={16} className="animate-spin mx-auto text-secondary" />
                      ) : (
                        <button
                          onClick={() => handleTestConnectivity(channel.id)}
                          className="p-1.5 rounded hover:bg-elevated transition-colors"
                          title="测试连通性"
                        >
                          {channel.connectivity.status === 'success' ? (
                            <CheckCircle size={16} className="text-[var(--brand-main)]" />
                          ) : channel.connectivity.status === 'error' ? (
                            <XCircle size={16} className="text-red-500" />
                          ) : (
                            <Wifi size={16} className="text-secondary" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleStatus(channel.id)}
                        className="cursor-pointer"
                      >
                        <Badge variant={channel.status === 'enabled' ? 'success' : 'neutral'}>
                          {channel.status === 'enabled' ? '启用' : '停用'}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleTestConnectivity(channel.id)}
                          className="p-1.5 rounded hover:bg-elevated transition-colors"
                          title="测试连通性"
                          disabled={channel.connectivity.status === 'testing'}
                        >
                          <Wifi size={14} className="text-secondary" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-elevated transition-colors"
                          title="编辑"
                          onClick={() => handleOpenDrawer(channel)}
                        >
                          <Pencil size={14} className="text-secondary" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredChannels.length === 0 && (
          <EmptyState
            icon={Plug}
            title="暂无渠道"
            description={search || statusFilter !== 'all' || healthFilter !== 'all' ? '没有匹配的渠道' : '还没有配置任何上游渠道'}
            action={
              !search && statusFilter === 'all' && healthFilter === 'all'
                ? { label: '新增第一个渠道', onClick: () => setModalOpen(true) }
                : undefined
            }
          />
        )}
      </Card>

      {/* Channel Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedChannel?.name ?? '渠道详情'}
        width="lg"
      >
        {selectedChannel && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{selectedChannel.vendorTag}</Badge>
                <Badge variant={HEALTH_CONFIG[selectedChannel.health].variant}>
                  {HEALTH_CONFIG[selectedChannel.health].label}
                </Badge>
                <Badge variant={selectedChannel.status === 'enabled' ? 'success' : 'neutral'}>
                  {selectedChannel.status === 'enabled' ? '启用' : '停用'}
                </Badge>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Wifi size={14} />}
                onClick={() => handleTestConnectivity(selectedChannel.id)}
                disabled={selectedChannel.connectivity.status === 'testing'}
              >
                {selectedChannel.connectivity.status === 'testing' ? '测试中...' : '测试连通性'}
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              {[
                { id: 'info' as const, label: '基本信息' },
                { id: 'oauth' as const, label: `OAuth 池 (${selectedChannel.oauthPool.length})` },
                { id: 'rateLimit' as const, label: '限速策略' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    drawerTab === tab.id
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                  style={{ backgroundColor: drawerTab === tab.id ? 'var(--bg-surface)' : undefined }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content: Info */}
            {drawerTab === 'info' && (
              <div className="space-y-4">
                {/* Connectivity Result */}
                {selectedChannel.connectivity.status !== 'idle' && (
                  <Card
                    className="p-4"
                    style={{
                      borderColor:
                        selectedChannel.connectivity.status === 'success'
                          ? 'var(--brand-main)'
                          : selectedChannel.connectivity.status === 'error'
                          ? '#ef4444'
                          : 'var(--border-color)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {selectedChannel.connectivity.status === 'testing' ? (
                        <Loader2 size={20} className="animate-spin text-secondary" />
                      ) : selectedChannel.connectivity.status === 'success' ? (
                        <CheckCircle size={20} className="text-[var(--brand-main)]" />
                      ) : (
                        <XCircle size={20} className="text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {CONNECTIVITY_STATUS[selectedChannel.connectivity.status].label}
                        </p>
                        {selectedChannel.connectivity.message && (
                          <p className="text-sm text-secondary mt-1">
                            {selectedChannel.connectivity.message}
                          </p>
                        )}
                        {selectedChannel.connectivity.testedAt && (
                          <p className="text-xs text-secondary mt-1">
                            测试时间: {selectedChannel.connectivity.testedAt}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-secondary text-xs">优先级</div>
                    <div className="text-lg font-bold mt-1">{selectedChannel.priority}</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-secondary text-xs">权重</div>
                    <div className="text-lg font-bold mt-1">{selectedChannel.weight}%</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-secondary text-xs">QPS 上限</div>
                    <div className="text-lg font-bold mt-1">{selectedChannel.qps}</div>
                  </div>
                </div>

                {/* Basic Info */}
                <Card>
                  <h4 className="font-bold mb-3">渠道信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">厂商</span>
                      <span>{selectedChannel.vendor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">端点</span>
                      <span className="font-mono text-xs">{selectedChannel.endpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">创建时间</span>
                      <span>{selectedChannel.createdAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">最后测试</span>
                      <span>{selectedChannel.lastTestedAt || '从未测试'}</span>
                    </div>
                  </div>
                </Card>

                {/* Supported Models */}
                <Card>
                  <h4 className="font-bold mb-3">支持模型</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedChannel.models.map((model) => (
                      <Badge key={model} variant="neutral" className="border border-[var(--border-color)]">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Tab Content: OAuth Pool */}
            {drawerTab === 'oauth' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary">OAuth 账号池用于负载均衡，支持轮询与会话粘滞策略。</p>
                  <Button variant="secondary" size="sm" icon={<Plus size={14} />}>
                    添加账号
                  </Button>
                </div>

                {selectedChannel.oauthPool.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="暂无 OAuth 账号"
                    description="请添加 OAuth 账号以启用负载均衡"
                    action={{ label: '添加第一个账号', onClick: () => {} }}
                  />
                ) : (
                  <div className="space-y-3">
                    {selectedChannel.oauthPool.map((account) => (
                      <Card key={account.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'var(--bg-elevated)' }}
                            >
                              <Users size={16} className="text-secondary" />
                            </div>
                            <div>
                              <p className="font-medium">{account.name}</p>
                              <p className="text-xs text-secondary font-mono">{account.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-mono">{account.dailyCalls.toLocaleString()} 次/日</p>
                              <p className="text-xs text-secondary">最后使用: {account.lastUsedAt}</p>
                            </div>
                            <Badge
                              variant={
                                account.status === 'active'
                                  ? 'success'
                                  : account.status === 'expired'
                                  ? 'warning'
                                  : 'error'
                              }
                            >
                              {account.status === 'active' ? '正常' : account.status === 'expired' ? '已过期' : '异常'}
                            </Badge>
                            <button className="p-1.5 rounded hover:bg-elevated transition-colors">
                              <Settings size={14} className="text-secondary" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Load Balancing Strategy */}
                <Card>
                  <h4 className="font-bold mb-3">负载均衡策略</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">轮询 (Round Robin)</p>
                        <p className="text-xs text-secondary">按顺序轮流使用各账号</p>
                      </div>
                      <input type="radio" name="lb-strategy" defaultChecked className="accent-[var(--brand-main)]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">会话粘滞 (Session Sticky)</p>
                        <p className="text-xs text-secondary">同一会话始终使用同一账号</p>
                      </div>
                      <input type="radio" name="lb-strategy" className="accent-[var(--brand-main)]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">最少调用 (Least Calls)</p>
                        <p className="text-xs text-secondary">优先使用调用次数最少的账号</p>
                      </div>
                      <input type="radio" name="lb-strategy" className="accent-[var(--brand-main)]" />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab Content: Rate Limit */}
            {drawerTab === 'rateLimit' && (
              <div className="space-y-4">
                <Card>
                  <h4 className="font-bold mb-4">限速配置</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">QPS (每秒请求数)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          defaultValue={selectedChannel.rateLimit.qps}
                          className="flex-1 accent-[var(--brand-main)]"
                        />
                        <span className="font-mono text-sm w-12 text-right">{selectedChannel.rateLimit.qps}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">TPM (每分钟 Token 数)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1000"
                          max="500000"
                          step="1000"
                          defaultValue={selectedChannel.rateLimit.tpm}
                          className="flex-1 accent-[var(--brand-main)]"
                        />
                        <span className="font-mono text-sm w-20 text-right">
                          {(selectedChannel.rateLimit.tpm / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">RPM (每分钟请求数)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="100"
                          max="10000"
                          step="100"
                          defaultValue={selectedChannel.rateLimit.rpm}
                          className="flex-1 accent-[var(--brand-main)]"
                        />
                        <span className="font-mono text-sm w-16 text-right">{selectedChannel.rateLimit.rpm}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h4 className="font-bold mb-4">超限策略</h4>
                  <p className="text-sm text-secondary mb-3">当请求超过限速阈值时的处理方式</p>
                  <div className="space-y-3">
                    {(['queue', 'reject', 'degrade'] as const).map((strategy) => (
                      <div
                        key={strategy}
                        className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-elevated transition-colors"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center gap-3">
                          <Shield size={16} className="text-secondary" />
                          <div>
                            <p className="text-sm font-medium">{STRATEGY_LABELS[strategy]}</p>
                            <p className="text-xs text-secondary">
                              {strategy === 'queue'
                                ? '请求排队等待，按顺序处理'
                                : strategy === 'reject'
                                ? '立即返回 429 错误'
                                : '自动降级到低优先级渠道'}
                            </p>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="rate-strategy"
                          defaultChecked={selectedChannel.rateLimit.strategy === strategy}
                          className="accent-[var(--brand-main)]"
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Rate Limit Preview */}
                <Card>
                  <h4 className="font-bold mb-3">当前配置预览</h4>
                  <div
                    className="p-3 rounded-lg font-mono text-sm"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div className="text-secondary mb-2">// 限速规则</div>
                    <div>
                      <span className="text-[var(--brand-main)]">qps</span>: {selectedChannel.rateLimit.qps}
                    </div>
                    <div>
                      <span className="text-[var(--brand-main)]">tpm</span>: {selectedChannel.rateLimit.tpm}
                    </div>
                    <div>
                      <span className="text-[var(--brand-main)]">rpm</span>: {selectedChannel.rateLimit.rpm}
                    </div>
                    <div>
                      <span className="text-[var(--brand-main)]">strategy</span>: "{selectedChannel.rateLimit.strategy}"
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <Button variant="secondary" className="flex-1" icon={<Pencil size={16} />}>
                编辑渠道
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                icon={selectedChannel.status === 'enabled' ? <WifiOff size={16} /> : <Wifi size={16} />}
                onClick={() => handleToggleStatus(selectedChannel.id)}
              >
                {selectedChannel.status === 'enabled' ? '停用渠道' : '启用渠道'}
              </Button>
            </div>
            {selectedChannel.status === 'enabled' && (
              <Button variant="danger" className="w-full" icon={<Trash2 size={16} />}>
                删除渠道
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* Add Channel Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="新增渠道"
        description="配置新的上游供应商 API 代理"
      >
        <div className="space-y-4">
          <Input label="渠道名称" placeholder="例如：Azure OpenAI 主力" required />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              供应商
            </label>
            <select className="input">
              <option value="">请选择供应商</option>
              <option value="openai">OpenAI</option>
              <option value="azure">Azure OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="zhipu">智谱 AI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <Input label="API 端点" placeholder="https://api.openai.com" required />
          <Input label="API Key" placeholder="sk-..." type="password" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="优先级" type="number" placeholder="1" />
            <Input label="权重 (%)" type="number" placeholder="100" />
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              支持模型
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'glm-4', 'deepseek-chat'].map((model) => (
                <label key={model} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[var(--brand-main)]" />
                  <span className="text-sm">{model}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              addToast({ type: 'success', title: '创建成功', message: '新渠道已添加' })
              setModalOpen(false)
            }}
          >
            创建渠道
          </Button>
        </div>
      </Modal>
    </div>
  )
}
