import { useState, useMemo } from 'react'
import {
  Code,
  Globe,
  Bell,
  BarChart3,
  Plus,
  Settings,
  Puzzle,
  Search,
  X,
  Trash2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Activity,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type HealthStatus = 'healthy' | 'degraded' | 'down'

interface Plugin {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  version: string
  author: string
  status: 'enabled' | 'disabled'
  health: HealthStatus
  calls7d: number
  calls7dLabel: string
  successRate: number
  isPublic: boolean
  certified: boolean
  permissions: string[]
  configItems: { key: string; label: string; type: string; value: string }[]
  installedAt: string
  lastUsed: string
}

/* ------------------------------------------------------------------ */
/*  Health Status Helpers                                              */
/* ------------------------------------------------------------------ */

const HEALTH_CONFIG: Record<HealthStatus, { label: string; color: string; dotClass: string; badgeVariant: 'success' | 'warning' | 'error' }> = {
  healthy: { label: '健康', color: '#10b981', dotClass: 'bg-emerald-500', badgeVariant: 'success' },
  degraded: { label: '降级', color: '#f59e0b', dotClass: 'bg-amber-500', badgeVariant: 'warning' },
  down: { label: '故障', color: '#ef4444', dotClass: 'bg-red-500', badgeVariant: 'error' },
}

function HealthDot({ status }: { status: HealthStatus }) {
  const config = HEALTH_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        {status === 'healthy' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotClass}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotClass}`} />
      </span>
      <span className="text-xs" style={{ color: config.color }}>{config.label}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_PLUGINS: Plugin[] = [
  {
    id: '1',
    name: '代码执行沙箱',
    description: '安全运行 Python/JS 代码片段，返回执行结果给 Agent。支持超时控制与资源隔离。',
    icon: <Code size={22} />,
    category: '代码工具',
    version: 'v2.3.1',
    author: 'AiGate 官方',
    status: 'enabled',
    health: 'healthy',
    calls7d: 420,
    calls7dLabel: '420',
    successRate: 99.5,
    isPublic: true,
    certified: true,
    permissions: ['代码执行', '文件读取', '网络访问'],
    configItems: [
      { key: 'timeout', label: '执行超时(秒)', type: 'number', value: '30' },
      { key: 'memory_limit', label: '内存限制(MB)', type: 'number', value: '512' },
      { key: 'allowed_langs', label: '允许的语言', type: 'text', value: 'python, javascript' },
    ],
    installedAt: '2026-03-15',
    lastUsed: '2 小时前',
  },
  {
    id: '2',
    name: '网页爬虫',
    description: '根据 URL 抓取并解析网页内容，供 Agent 参考引用。支持 JS 渲染页面。',
    icon: <Globe size={22} />,
    category: '数据处理',
    version: 'v1.8.0',
    author: 'AiGate 官方',
    status: 'enabled',
    health: 'healthy',
    calls7d: 238,
    calls7dLabel: '238',
    successRate: 98.2,
    isPublic: true,
    certified: true,
    permissions: ['网络访问', 'HTML 解析'],
    configItems: [
      { key: 'max_pages', label: '最大页面数', type: 'number', value: '10' },
      { key: 'render_js', label: 'JS 渲染', type: 'boolean', value: 'true' },
      { key: 'user_agent', label: 'User-Agent', type: 'text', value: 'AiGate-Bot/1.0' },
    ],
    installedAt: '2026-03-20',
    lastUsed: '5 小时前',
  },
  {
    id: '3',
    name: '钉钉通知',
    description: '将 Agent 执行结果推送到钉钉群消息或个人工作通知，支持 Markdown 格式。',
    icon: <Bell size={22} />,
    category: '通知推送',
    version: 'v1.2.0',
    author: '社区贡献',
    status: 'disabled',
    health: 'down',
    calls7d: 0,
    calls7dLabel: '0',
    successRate: 0,
    isPublic: true,
    certified: false,
    permissions: ['消息发送', 'Webhook 调用'],
    configItems: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', value: '' },
      { key: 'secret', label: '签名密钥', type: 'password', value: '' },
    ],
    installedAt: '2026-04-01',
    lastUsed: '30 天前',
  },
  {
    id: '4',
    name: 'CSV 数据分析',
    description: '解析上传的 CSV 文件并生成统计报告与图表描述，支持 Pandas DataFrame 操作。',
    icon: <BarChart3 size={22} />,
    category: '数据处理',
    version: 'v3.0.2',
    author: 'AiGate 官方',
    status: 'enabled',
    health: 'healthy',
    calls7d: 156,
    calls7dLabel: '156',
    successRate: 99.8,
    isPublic: true,
    certified: true,
    permissions: ['文件读取', '数据处理'],
    configItems: [
      { key: 'max_rows', label: '最大行数', type: 'number', value: '100000' },
      { key: 'encoding', label: '默认编码', type: 'text', value: 'utf-8' },
    ],
    installedAt: '2026-02-28',
    lastUsed: '1 天前',
  },
  {
    id: '5',
    name: '企业通讯录查询',
    description: '查询企业内部通讯录，支持按姓名、部门、工号模糊搜索，返回联系方式。',
    icon: <Users size={22} />,
    category: '企业集成',
    version: 'v1.0.0',
    author: 'IT 部门',
    status: 'enabled',
    health: 'healthy',
    calls7d: 89,
    calls7dLabel: '89',
    successRate: 100,
    isPublic: false,
    certified: false,
    permissions: ['通讯录读取'],
    configItems: [
      { key: 'sync_interval', label: '同步间隔(小时)', type: 'number', value: '6' },
      { key: 'cache_ttl', label: '缓存时间(分钟)', type: 'number', value: '30' },
    ],
    installedAt: '2026-04-10',
    lastUsed: '3 小时前',
  },
  {
    id: '6',
    name: '内部审批流触发',
    description: '对接企业 OA 系统，自动发起审批流程（请假、报销、采购等），返回审批编号。',
    icon: <FileCode size={22} />,
    category: '企业集成',
    version: 'v2.1.0',
    author: 'IT 部门',
    status: 'enabled',
    health: 'degraded',
    calls7d: 34,
    calls7dLabel: '34',
    successRate: 94.1,
    isPublic: false,
    certified: false,
    permissions: ['审批发起', '审批查询', 'OA 接口'],
    configItems: [
      { key: 'oa_endpoint', label: 'OA 系统地址', type: 'text', value: 'https://oa.internal/api' },
      { key: 'default_approver', label: '默认审批人', type: 'text', value: '' },
      { key: 'auto_submit', label: '自动提交', type: 'boolean', value: 'false' },
    ],
    installedAt: '2026-05-01',
    lastUsed: '12 小时前',
  },
]

/* ------------------------------------------------------------------ */
/*  Stats computation                                                  */
/* ------------------------------------------------------------------ */

const STATS = {
  totalPlugins: MOCK_PLUGINS.length,
  publicCount: MOCK_PLUGINS.filter((p) => p.isPublic).length,
  privateCount: MOCK_PLUGINS.filter((p) => !p.isPublic).length,
  healthyCount: MOCK_PLUGINS.filter((p) => p.health === 'healthy').length,
  totalCalls7d: MOCK_PLUGINS.reduce((sum, p) => sum + p.calls7d, 0),
  avgSuccessRate: +(
    MOCK_PLUGINS.filter((p) => p.calls7d > 0).reduce((sum, p) => sum + p.successRate, 0) /
    MOCK_PLUGINS.filter((p) => p.calls7d > 0).length
  ).toFixed(1),
  topPlugins: [...MOCK_PLUGINS].sort((a, b) => b.calls7d - a.calls7d).slice(0, 5),
}

const CATEGORIES = ['全部', '代码工具', '数据处理', '通知推送', '企业集成']

const MAIN_TABS = [
  { id: 'public', label: '公共市场', count: STATS.publicCount },
  { id: 'private', label: '企业私有库', count: STATS.privateCount },
  { id: 'stats', label: '调用统计' },
]

const DETAIL_TABS = [
  { id: 'overview', label: '概览' },
  { id: 'config', label: '配置' },
  { id: 'permissions', label: '权限' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Plugins() {
  const [activeTab, setActiveTab] = useState('public')
  const [detailTab, setDetailTab] = useState('overview')
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [pluginName, setPluginName] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { addToast } = useUIStore()

  const hasActiveFilters = categoryFilter !== '全部' || statusFilter !== 'all'

  const clearFilters = () => {
    setCategoryFilter('全部')
    setStatusFilter('all')
    setSearch('')
  }

  const filteredPlugins = useMemo(() => {
    return MOCK_PLUGINS.filter((plugin) => {
      const matchesTab = activeTab === 'public' ? plugin.isPublic : activeTab === 'private' ? !plugin.isPublic : true
      const matchesSearch = !search || plugin.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === '全部' || plugin.category === categoryFilter
      const matchesStatus = statusFilter === 'all' || plugin.status === statusFilter
      return matchesTab && matchesSearch && matchesCategory && matchesStatus
    })
  }, [activeTab, search, categoryFilter, statusFilter])

  const openDetail = (plugin: Plugin) => {
    setSelectedPlugin(plugin)
    setDetailTab('overview')
    setDrawerOpen(true)
  }

  const handleInstall = () => {
    if (!pluginName.trim()) {
      addToast({ type: 'warning', title: '请输入插件名称' })
      return
    }
    addToast({ type: 'success', title: '安装成功', message: `插件「${pluginName}」已成功安装并启用` })
    setModalOpen(false)
    setPluginName('')
  }

  const handleUninstall = (pluginName: string) => {
    addToast({ type: 'info', title: '已卸载', message: `插件「${pluginName}」已从当前环境卸载` })
    setDrawerOpen(false)
  }

  const handleToggleStatus = (pluginName: string, currentStatus: string) => {
    const action = currentStatus === 'enabled' ? '停用' : '启用'
    addToast({ type: 'success', title: `已${action}`, message: `插件「${pluginName}」已${action}` })
  }

  return (
    <div>
      <PageHeader
        title="插件市场"
        subtitle="扩展 Agent 能力的功能插件，可独立安装启用，无需修改代码。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'Plugins 插件' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            安装插件
          </Button>
        }
      />

      {/* Main Tabs */}
      <Tabs tabs={MAIN_TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Search & Filters */}
      {activeTab !== 'stats' && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="搜索插件..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />

            <select
              className="input text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ minWidth: 140 }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === '全部' ? '全部分类' : cat}
                </option>
              ))}
            </select>

            <select
              className="input text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="all">全部状态</option>
              <option value="enabled">已启用</option>
              <option value="disabled">已停用</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer"
                style={{ color: 'var(--brand-main)', background: 'var(--bg-elevated)' }}
              >
                <X size={12} />
                清除筛选
              </button>
            )}

            <span className="text-xs text-secondary ml-auto">
              共 <strong style={{ color: 'var(--text-primary)' }}>{filteredPlugins.length}</strong> 个插件
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'stats' ? (
        /* ============================================================ */
        /*  Stats Tab                                                   */
        /* ============================================================ */
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <Puzzle size={18} />
                </div>
                <span className="text-xs text-secondary">插件总数</span>
              </div>
              <div className="text-2xl font-bold">{STATS.totalPlugins}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: '#10b981' }}>{STATS.healthyCount} 健康</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <Activity size={18} />
                </div>
                <span className="text-xs text-secondary">近 7 天总调用</span>
              </div>
              <div className="text-2xl font-bold">{STATS.totalCalls7d.toLocaleString()}</div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <CheckCircle2 size={18} />
                </div>
                <span className="text-xs text-secondary">平均成功率</span>
              </div>
              <div className="text-2xl font-bold">{STATS.avgSuccessRate}%</div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <Globe size={18} />
                </div>
                <span className="text-xs text-secondary">公共 / 私有</span>
              </div>
              <div className="text-2xl font-bold">
                {STATS.publicCount} <span className="text-sm font-normal text-secondary">/</span> {STATS.privateCount}
              </div>
            </Card>
          </div>

          {/* Top 5 Plugins by Calls */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">调用排行 Top 5</h3>
              <span className="text-xs text-secondary">近 7 天</span>
            </div>
            <div className="space-y-4">
              {STATS.topPlugins.map((plugin, idx) => {
                const maxCalls = STATS.topPlugins[0].calls7d
                const barWidth = maxCalls > 0 ? (plugin.calls7d / maxCalls) * 100 : 0
                return (
                  <div key={plugin.id} className="flex items-center gap-4">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: idx === 0 ? 'var(--brand-main)' : 'var(--bg-elevated)',
                        color: idx === 0 ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{plugin.name}</span>
                        <span className="text-sm font-bold shrink-0 ml-2">{plugin.calls7dLabel}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            background: idx === 0 ? 'var(--brand-main)' : 'var(--brand-accent)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-secondary shrink-0 w-16 text-right">{plugin.successRate}%</div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Per-plugin detail table */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">插件明细</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left py-3 px-2 text-xs font-medium text-secondary">插件名称</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-secondary">分类</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-secondary">版本</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-secondary">来源</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-secondary">健康状态</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-secondary">调用量</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-secondary">成功率</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PLUGINS.map((plugin) => (
                    <tr key={plugin.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--brand-main)' }}>{plugin.icon}</span>
                          <span className="font-medium">{plugin.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-color)' }}>
                          {plugin.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-secondary">{plugin.version}</td>
                      <td className="py-3 px-2 text-secondary">{plugin.author}</td>
                      <td className="py-3 px-2">
                        <HealthDot status={plugin.health} />
                      </td>
                      <td className="py-3 px-2 text-right font-medium">{plugin.calls7dLabel}</td>
                      <td className="py-3 px-2 text-right">
                        <span style={{ color: plugin.successRate >= 99 ? '#10b981' : plugin.successRate >= 95 ? '#f59e0b' : '#ef4444' }}>
                          {plugin.calls7d > 0 ? `${plugin.successRate}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="暂无插件"
          description={
            hasActiveFilters
              ? '没有符合筛选条件的插件，请调整筛选项'
              : activeTab === 'public'
                ? '公共市场暂无可用插件'
                : '还没有安装任何私有插件'
          }
          action={
            hasActiveFilters
              ? { label: '清除筛选', onClick: clearFilters }
              : activeTab === 'private'
                ? { label: '安装插件', onClick: () => setModalOpen(true) }
                : undefined
          }
        />
      ) : (
        /* ============================================================ */
        /*  Plugin Grid                                                  */
        /* ============================================================ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlugins.map((plugin) => (
            <Card key={plugin.id} hover className="flex flex-col hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl border flex items-center justify-center"
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--brand-main)',
                  }}
                >
                  {plugin.icon}
                </div>
                <div className="flex items-center gap-2">
                  {plugin.certified && (
                    <Badge variant="info" size="sm">
                      官方认证
                    </Badge>
                  )}
                  <Badge variant={plugin.status === 'enabled' ? 'success' : 'warning'}>
                    {plugin.status === 'enabled' ? '已启用' : '已停用'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base">{plugin.name}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {plugin.version}
                </span>
              </div>

              <p className="text-secondary text-sm flex-1 mb-4">{plugin.description}</p>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-color)' }}>
                  {plugin.category}
                </span>
                <span className="text-xs text-secondary">{plugin.author}</span>
              </div>

              {/* Health & Metrics Row */}
              <div className="flex items-center gap-4 mb-3 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <HealthDot status={plugin.health} />
                {plugin.calls7d > 0 && (
                  <span className="text-xs text-secondary">
                    成功率 <strong style={{ color: plugin.successRate >= 99 ? '#10b981' : '#f59e0b' }}>{plugin.successRate}%</strong>
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-secondary">
                  近7天调用: <strong style={{ color: 'var(--text-primary)' }}>{plugin.calls7dLabel}</strong>
                </span>
                <div className="flex gap-3">
                  <button
                    className="text-xs font-bold text-secondary hover:text-primary cursor-pointer"
                    onClick={() => handleToggleStatus(plugin.name, plugin.status)}
                  >
                    {plugin.status === 'enabled' ? (
                      <>
                        <AlertTriangle size={12} className="inline mr-1" />
                        停用
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} className="inline mr-1" />
                        启用
                      </>
                    )}
                  </button>
                  <button
                    className="text-xs font-bold text-brand-main hover:underline cursor-pointer"
                    onClick={() => openDetail(plugin)}
                  >
                    <Settings size={12} className="inline mr-1" />
                    详情
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Detail Drawer                                                */}
      {/* ============================================================ */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedPlugin?.name ?? ''}
        description={`${selectedPlugin?.category} - ${selectedPlugin?.author}`}
        width="md"
      >
        {selectedPlugin && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl border flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--bg-body)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--brand-main)',
                }}
              >
                {selectedPlugin.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{selectedPlugin.name}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {selectedPlugin.version}
                  </span>
                  {selectedPlugin.certified && <Badge variant="info" size="sm">官方认证</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <HealthDot status={selectedPlugin.health} />
                  <Badge variant={selectedPlugin.status === 'enabled' ? 'success' : 'warning'}>
                    {selectedPlugin.status === 'enabled' ? '已启用' : '已停用'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Detail Tabs */}
            <Tabs tabs={DETAIL_TABS} activeTab={detailTab} onChange={setDetailTab} />

            {/* Tab Content */}
            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>描述</h4>
                  <p className="text-sm">{selectedPlugin.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-secondary block mb-1">分类</span>
                    <span className="text-sm font-medium">{selectedPlugin.category}</span>
                  </div>
                  <div>
                    <span className="text-xs text-secondary block mb-1">提供方</span>
                    <span className="text-sm font-medium">{selectedPlugin.author}</span>
                  </div>
                  <div>
                    <span className="text-xs text-secondary block mb-1">安装日期</span>
                    <span className="text-sm font-medium">{selectedPlugin.installedAt}</span>
                  </div>
                  <div>
                    <span className="text-xs text-secondary block mb-1">最近使用</span>
                    <span className="text-sm font-medium">{selectedPlugin.lastUsed}</span>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4 border"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                >
                  <h4 className="text-sm font-medium mb-3">近 7 天调用指标</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs text-secondary block mb-1">调用次数</span>
                      <span className="text-lg font-bold">{selectedPlugin.calls7dLabel}</span>
                    </div>
                    <div>
                      <span className="text-xs text-secondary block mb-1">成功率</span>
                      <span className="text-lg font-bold" style={{ color: selectedPlugin.successRate >= 99 ? '#10b981' : '#f59e0b' }}>
                        {selectedPlugin.calls7d > 0 ? `${selectedPlugin.successRate}%` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-secondary block mb-1">健康状态</span>
                      <HealthDot status={selectedPlugin.health} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'config' && (
              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  配置插件的运行参数，修改后立即生效。
                </p>
                {selectedPlugin.configItems.map((item) => (
                  <div key={item.key}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </label>
                    {item.type === 'boolean' ? (
                      <select className="input" defaultValue={item.value}>
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    ) : (
                      <Input
                        type={item.type === 'number' ? 'number' : 'text'}
                        defaultValue={item.value}
                        placeholder={`请输入${item.label}`}
                      />
                    )}
                  </div>
                ))}
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={() => addToast({ type: 'success', title: '配置已保存' })}>
                    保存配置
                  </Button>
                </div>
              </div>
            )}

            {detailTab === 'permissions' && (
              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  该插件运行时需要以下权限，安装时已授权。
                </p>
                <div className="space-y-2">
                  {selectedPlugin.permissions.map((perm) => (
                    <div
                      key={perm}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <Shield size={16} style={{ color: 'var(--brand-main)' }} />
                      <span className="text-sm font-medium">{perm}</span>
                      <Badge variant="success" size="sm" className="ml-auto">
                        已授权
                      </Badge>
                    </div>
                  ))}
                </div>
                <div
                  className="rounded-lg p-4 border"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
                    <div>
                      <p className="text-sm font-medium">权限说明</p>
                      <p className="text-xs text-secondary mt-1">
                        插件在沙箱环境中运行，权限范围由安装时配置决定。如需调整权限，请卸载后重新安装。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div
              className="flex justify-between items-center pt-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => handleUninstall(selectedPlugin.name)}
                className="text-red-500 hover:text-red-600"
              >
                卸载插件
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
                  关闭
                </Button>
                <Button
                  variant={selectedPlugin.status === 'enabled' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleStatus(selectedPlugin.name, selectedPlugin.status)}
                >
                  {selectedPlugin.status === 'enabled' ? '停用' : '启用'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================ */}
      {/*  Install Modal                                                */}
      {/* ============================================================ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="安装新插件"
        description="从插件市场选择或上传自定义插件包，安装后可在 Agent 编排中启用。"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="插件名称"
            placeholder="例如：飞书审批通知"
            value={pluginName}
            onChange={(e) => setPluginName(e.target.value)}
          />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              插件来源
            </label>
            <select className="input">
              <option>官方市场</option>
              <option>私有仓库</option>
              <option>本地上传 (zip)</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              授权可见范围
            </label>
            <select className="input">
              <option>仅当前项目可见</option>
              <option>全租户公开共享</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              分类
            </label>
            <select className="input">
              <option>代码工具</option>
              <option>数据处理</option>
              <option>通知推送</option>
              <option>企业集成</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleInstall}>
            开始安装
          </Button>
        </div>
      </Modal>
    </div>
  )
}
