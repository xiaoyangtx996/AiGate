import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Drawer } from '@/components/ui/Drawer'
import {
  Boxes,
  Radio,
  AlertTriangle,
  DollarSign,
  Plus,
  Search,
  TrendingUp,
  Settings,
  Eye,
  ChevronRight,
  Shield,
  Pencil,
  Copy,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  Users,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ModelType = 'Chat' | 'Image' | 'Video' | 'Embedding' | 'Audio' | 'Code'
type ModelStatus = 'active' | 'low' | 'exhausted' | 'deprecated'
type HealthStatus = 'healthy' | 'degraded' | 'down'

interface PricingTier {
  id: string
  name: string
  inputPrice: number
  outputPrice: number
  unit: string
}

interface VisibilityRule {
  id: string
  type: 'role' | 'department' | 'user'
  name: string
  allowed: boolean
}

interface ModelItem {
  id: string
  name: string
  vendor: string
  type: ModelType
  channel: string
  pricing: PricingTier
  remaining: string
  usedPercent: number
  status: ModelStatus
  health: HealthStatus
  todayCalls: number
  monthCalls: number
  monthCost: number
  avgLatency: number
  successRate: number
  description: string
  contextWindow: string
  visibility: VisibilityRule[]
  lastUpdated: string
}

interface CallRankItem {
  rank: number
  name: string
  calls: number
  cost: number
  trend: number
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_MODELS: ModelItem[] = [
  {
    id: '1',
    name: 'gpt-4o',
    vendor: 'OpenAI',
    type: 'Chat',
    channel: 'OpenAI Official',
    pricing: { id: 'p1', name: '标准定价', inputPrice: 2.5, outputPrice: 10, unit: '$/M tokens' },
    remaining: '$180.00',
    usedPercent: 36,
    status: 'active',
    health: 'healthy',
    todayCalls: 8432,
    monthCalls: 245000,
    monthCost: 3420.5,
    avgLatency: 320,
    successRate: 99.8,
    description: 'GPT-4o 是 OpenAI 的旗舰多模态模型，支持文本、图像和音频输入。',
    contextWindow: '128K',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
      { id: 'v2', type: 'role', name: '分公司管理员', allowed: true },
      { id: 'v3', type: 'role', name: '部门负责人', allowed: true },
      { id: 'v4', type: 'department', name: 'AI 研发部', allowed: true },
      { id: 'v5', type: 'department', name: '前端开发组', allowed: true },
      { id: 'v6', type: 'department', name: '销售部', allowed: false },
    ],
    lastUpdated: '2026-05-20 14:30',
  },
  {
    id: '2',
    name: 'claude-3-5-sonnet',
    vendor: 'Anthropic',
    type: 'Chat',
    channel: 'Anthropic Claude',
    pricing: { id: 'p2', name: '标准定价', inputPrice: 3, outputPrice: 15, unit: '$/M tokens' },
    remaining: '$12.40',
    usedPercent: 92,
    status: 'low',
    health: 'healthy',
    todayCalls: 3218,
    monthCalls: 156000,
    monthCost: 2840.2,
    avgLatency: 280,
    successRate: 99.5,
    description: 'Claude 3.5 Sonnet 是 Anthropic 的高性能模型，擅长复杂推理和代码生成。',
    contextWindow: '200K',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
      { id: 'v2', type: 'role', name: '分公司管理员', allowed: true },
      { id: 'v3', type: 'department', name: 'AI 研发部', allowed: true },
    ],
    lastUpdated: '2026-05-20 12:15',
  },
  {
    id: '3',
    name: 'dall-e-3',
    vendor: 'OpenAI',
    type: 'Image',
    channel: 'OpenAI Official',
    pricing: { id: 'p3', name: '标准定价', inputPrice: 0.04, outputPrice: 0, unit: '$/图' },
    remaining: '$45.00',
    usedPercent: 45,
    status: 'active',
    health: 'healthy',
    todayCalls: 124,
    monthCalls: 3200,
    monthCost: 128.0,
    avgLatency: 8500,
    successRate: 98.2,
    description: 'DALL-E 3 是 OpenAI 的图像生成模型，支持高质量图像创作。',
    contextWindow: 'N/A',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
      { id: 'v2', type: 'role', name: '分公司管理员', allowed: true },
      { id: 'v3', type: 'role', name: '部门负责人', allowed: true },
      { id: 'v4', type: 'role', name: '项目负责人', allowed: true },
    ],
    lastUpdated: '2026-05-19 18:00',
  },
  {
    id: '4',
    name: 'sora-turbo',
    vendor: 'OpenAI',
    type: 'Video',
    channel: 'OpenAI Official',
    pricing: { id: 'p4', name: '标准定价', inputPrice: 0.1, outputPrice: 0, unit: '$/秒' },
    remaining: '$320.00',
    usedPercent: 20,
    status: 'active',
    health: 'degraded',
    todayCalls: 18,
    monthCalls: 420,
    monthCost: 560.0,
    avgLatency: 45000,
    successRate: 92.5,
    description: 'Sora Turbo 是 OpenAI 的视频生成模型，支持文本到视频转换。',
    contextWindow: 'N/A',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
      { id: 'v2', type: 'role', name: '分公司管理员', allowed: true },
    ],
    lastUpdated: '2026-05-20 09:30',
  },
  {
    id: '5',
    name: 'text-embedding-3-large',
    vendor: 'OpenAI',
    type: 'Embedding',
    channel: 'OpenAI Official',
    pricing: { id: 'p5', name: '标准定价', inputPrice: 0.13, outputPrice: 0, unit: '$/M tokens' },
    remaining: '$88.00',
    usedPercent: 44,
    status: 'active',
    health: 'healthy',
    todayCalls: 45210,
    monthCalls: 1250000,
    monthCost: 162.5,
    avgLatency: 45,
    successRate: 99.9,
    description: 'Text Embedding 3 Large 是 OpenAI 的文本嵌入模型，适用于 RAG 和语义搜索。',
    contextWindow: '8K',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
      { id: 'v2', type: 'role', name: '分公司管理员', allowed: true },
      { id: 'v3', type: 'role', name: '部门负责人', allowed: true },
      { id: 'v4', type: 'role', name: '项目负责人', allowed: true },
      { id: 'v5', type: 'role', name: '普通员工', allowed: true },
    ],
    lastUpdated: '2026-05-20 15:00',
  },
  {
    id: '6',
    name: 'deepseek-coder',
    vendor: 'DeepSeek',
    type: 'Code',
    channel: 'DeepSeek Official',
    pricing: { id: 'p6', name: '标准定价', inputPrice: 0.14, outputPrice: 0.28, unit: '$/M tokens' },
    remaining: '$256.00',
    usedPercent: 28,
    status: 'active',
    health: 'healthy',
    todayCalls: 12500,
    monthCalls: 380000,
    monthCost: 892.0,
    avgLatency: 180,
    successRate: 99.6,
    description: 'DeepSeek Coder 是专为代码生成和理解优化的模型。',
    contextWindow: '128K',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
      { id: 'v2', type: 'role', name: '分公司管理员', allowed: true },
      { id: 'v3', type: 'role', name: '部门负责人', allowed: true },
      { id: 'v4', type: 'department', name: 'AI 研发部', allowed: true },
      { id: 'v5', type: 'department', name: '前端开发组', allowed: true },
    ],
    lastUpdated: '2026-05-20 10:45',
  },
  {
    id: '7',
    name: 'whisper-large-v3',
    vendor: 'OpenAI',
    type: 'Audio',
    channel: 'OpenAI Official',
    pricing: { id: 'p7', name: '标准定价', inputPrice: 0.006, outputPrice: 0, unit: '$/分钟' },
    remaining: '$67.00',
    usedPercent: 33,
    status: 'active',
    health: 'healthy',
    todayCalls: 856,
    monthCalls: 24000,
    monthCost: 144.0,
    avgLatency: 2200,
    successRate: 99.1,
    description: 'Whisper Large V3 是 OpenAI 的语音识别模型，支持多语言转录。',
    contextWindow: 'N/A',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
      { id: 'v2', type: 'role', name: '分公司管理员', allowed: true },
    ],
    lastUpdated: '2026-05-19 22:00',
  },
  {
    id: '8',
    name: 'gpt-4-turbo',
    vendor: 'OpenAI',
    type: 'Chat',
    channel: 'OpenAI Official',
    pricing: { id: 'p8', name: '标准定价', inputPrice: 10, outputPrice: 30, unit: '$/M tokens' },
    remaining: '$0.00',
    usedPercent: 100,
    status: 'exhausted',
    health: 'healthy',
    todayCalls: 0,
    monthCalls: 89000,
    monthCost: 4520.0,
    avgLatency: 380,
    successRate: 99.7,
    description: 'GPT-4 Turbo 是 OpenAI 的高性能模型，支持 128K 上下文。',
    contextWindow: '128K',
    visibility: [
      { id: 'v1', type: 'role', name: '集团 IT 管理员', allowed: true },
    ],
    lastUpdated: '2026-05-18 16:30',
  },
]

const CALL_RANKING: CallRankItem[] = [
  { rank: 1, name: 'text-embedding-3-large', calls: 1250000, cost: 162.5, trend: 12.5 },
  { rank: 2, name: 'gpt-4o', calls: 245000, cost: 3420.5, trend: 8.2 },
  { rank: 3, name: 'deepseek-coder', calls: 380000, cost: 892.0, trend: 15.3 },
  { rank: 4, name: 'gpt-4-turbo', calls: 89000, cost: 4520.0, trend: -5.2 },
  { rank: 5, name: 'claude-3-5-sonnet', calls: 156000, cost: 2840.2, trend: 22.1 },
  { rank: 6, name: 'whisper-large-v3', calls: 24000, cost: 144.0, trend: 3.8 },
  { rank: 7, name: 'dall-e-3', calls: 3200, cost: 128.0, trend: -2.1 },
  { rank: 8, name: 'sora-turbo', calls: 420, cost: 560.0, trend: 45.6 },
]

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODEL_TYPE_TABS = [
  { id: 'all', label: '全部' },
  { id: 'Chat', label: 'Chat' },
  { id: 'Image', label: 'Image' },
  { id: 'Video', label: 'Video' },
  { id: 'Embedding', label: 'Embedding' },
  { id: 'Audio', label: 'Audio' },
  { id: 'Code', label: 'Code' },
]

const STATUS_CONFIG: Record<ModelStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  active: { label: '正常', variant: 'success' },
  low: { label: '低余量', variant: 'warning' },
  exhausted: { label: '已耗尽', variant: 'error' },
  deprecated: { label: '已废弃', variant: 'neutral' },
}

const HEALTH_CONFIG: Record<HealthStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  healthy: { label: '健康', variant: 'success' },
  degraded: { label: '降级', variant: 'warning' },
  down: { label: '不可用', variant: 'error' },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatCurrency(num: number): string {
  return '¥' + num.toFixed(2)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Models() {
  // State
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [vendorFilter, setVendorFilter] = useState('全部供应商')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [healthFilter, setHealthFilter] = useState('全部')
  const [selectedModel, setSelectedModel] = useState<ModelItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'info' | 'pricing' | 'visibility'>('info')

  // Derived
  const kpiCards = useMemo(() => {
    const activeModels = MOCK_MODELS.filter((m) => m.status === 'active').length
    const channels = new Set(MOCK_MODELS.map((m) => m.channel)).size
    const lowModels = MOCK_MODELS.filter((m) => m.status === 'low' || m.status === 'exhausted').length
    const totalCost = MOCK_MODELS.reduce((sum, m) => sum + m.monthCost, 0)
    return [
      { label: '活跃模型', value: activeModels.toString(), icon: Boxes, color: 'text-brand-main' },
      { label: '渠道来源', value: channels.toString(), icon: Radio, color: '' },
      { label: '低余量预警', value: lowModels.toString(), icon: AlertTriangle, color: 'text-brand-accent' },
      { label: '本月消耗', value: formatCurrency(totalCost), icon: DollarSign, color: '' },
    ]
  }, [])

  const filteredModels = useMemo(() => {
    return MOCK_MODELS.filter((model) => {
      const matchesType = activeTab === 'all' || model.type === activeTab
      const matchesSearch = !search || model.name.toLowerCase().includes(search.toLowerCase()) || model.vendor.toLowerCase().includes(search.toLowerCase())
      const matchesVendor = vendorFilter === '全部供应商' || model.vendor === vendorFilter
      const matchesStatus = statusFilter === '全部' || STATUS_CONFIG[model.status].label === statusFilter
      const matchesHealth = healthFilter === '全部' || HEALTH_CONFIG[model.health].label === healthFilter
      return matchesType && matchesSearch && matchesVendor && matchesStatus && matchesHealth
    })
  }, [activeTab, search, vendorFilter, statusFilter, healthFilter])

  const vendors = useMemo(() => {
    return Array.from(new Set(MOCK_MODELS.map((m) => m.vendor)))
  }, [])

  // Handlers
  function handleOpenDrawer(model: ModelItem) {
    setSelectedModel(model)
    setDrawerOpen(true)
    setDrawerTab('info')
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    setSelectedModel(null)
  }

  function getBarColor(model: ModelItem): string {
    if (model.status === 'low' || model.status === 'exhausted') return 'var(--brand-accent)'
    return 'var(--brand-main)'
  }

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="模型资产管理"
        subtitle="管理所有渠道下的可用模型，配置定价策略与可见性权限，监控调用健康状态。"
        breadcrumbs={[
          { label: '网关接入', path: '/channels' },
          { label: '模型资产' },
        ]}
        actions={
          <Button icon={<Plus size={16} />}>添加模型</Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="text-center p-5">
            <div className="flex items-center justify-center mb-2">
              <kpi.icon size={20} className={kpi.color || 'text-secondary'} />
            </div>
            <div className={`text-3xl font-black mb-1 ${kpi.color}`}>
              {kpi.value}
            </div>
            <div className="text-xs text-secondary uppercase tracking-widest">
              {kpi.label}
            </div>
          </Card>
        ))}
      </div>

      {/* Model Type Tabs */}
      <div className="mb-4">
        <Tabs
          tabs={MODEL_TYPE_TABS.map((tab) => ({
            ...tab,
            count: tab.id === 'all' ? undefined : MOCK_MODELS.filter((m) => m.type === tab.id).length,
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Filters */}
      <Card
        className="mb-6 flex flex-wrap gap-4 items-end p-4"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div className="space-y-1 flex-1 min-w-48">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            搜索
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="搜索模型名称或供应商..."
              className="input-base w-full pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1 flex-1 min-w-36">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            供应商
          </label>
          <select
            className="input-base w-full"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          >
            <option>全部供应商</option>
            {vendors.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-32">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            状态
          </label>
          <select
            className="input-base w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>全部</option>
            <option>正常</option>
            <option>低余量</option>
            <option>已耗尽</option>
            <option>已废弃</option>
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-32">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            健康状态
          </label>
          <select
            className="input-base w-full"
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
          >
            <option>全部</option>
            <option>健康</option>
            <option>降级</option>
            <option>不可用</option>
          </select>
        </div>
      </Card>

      {/* Main Content: Table + Ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Models Table */}
        <Card className="xl:col-span-3 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead
                className="border-b"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <tr>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                    模型名称
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                    类型
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                    定价
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                    剩余额度
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                    额度水位
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                    今日调用
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">
                    健康
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">
                    状态
                  </th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody
                className="text-sm divide-y"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {filteredModels.map((model) => {
                  const remainingPercent = 100 - model.usedPercent
                  const barColor = getBarColor(model)

                  return (
                    <tr
                      key={model.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer border-b"
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => handleOpenDrawer(model)}
                    >
                      <td className="p-4">
                        <div className="font-bold">{model.name}</div>
                        <div className="text-xs text-secondary mt-0.5">
                          {model.vendor} · {model.channel}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2 py-0.5 text-xs rounded border"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          {model.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs">
                          <span className="text-secondary">入</span>{' '}
                          <span className="font-bold">${model.pricing.inputPrice}</span>
                        </div>
                        {model.pricing.outputPrice > 0 && (
                          <div className="font-mono text-xs">
                            <span className="text-secondary">出</span>{' '}
                            <span className="font-bold">${model.pricing.outputPrice}</span>
                          </div>
                        )}
                        <div className="text-xs text-secondary mt-0.5">
                          {model.pricing.unit}
                        </div>
                      </td>
                      <td
                        className={`p-4 font-mono font-bold ${model.status === 'low' || model.status === 'exhausted' ? 'text-brand-accent' : ''}`}
                      >
                        {model.remaining}
                      </td>
                      <td className="p-4 w-40">
                        <div
                          className="w-full h-2 rounded-full"
                          style={{ background: 'var(--border-color)' }}
                        >
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${remainingPercent}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                        <div
                          className={`text-xs mt-1 ${model.status === 'low' || model.status === 'exhausted' ? 'text-brand-accent' : 'text-secondary'}`}
                        >
                          已用 {model.usedPercent}% · 余 {remainingPercent}%
                        </div>
                      </td>
                      <td className="p-4 font-mono">{formatNumber(model.todayCalls)}</td>
                      <td className="p-4 text-center">
                        <Badge variant={HEALTH_CONFIG[model.health].variant}>
                          {HEALTH_CONFIG[model.health].label}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={STATUS_CONFIG[model.status].variant}>
                          {STATUS_CONFIG[model.status].label}
                        </Badge>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="text-brand-main font-bold text-xs hover:underline"
                          onClick={() => handleOpenDrawer(model)}
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {filteredModels.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-12 text-center text-secondary text-sm"
                    >
                      没有符合条件的模型数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Call Ranking */}
        <Card className="p-0 overflow-hidden">
          <div
            className="p-4 border-b flex items-center gap-2"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
          >
            <BarChart3 size={16} className="text-brand-main" />
            <h3 className="font-bold text-sm">调用排行榜</h3>
            <span className="text-xs text-secondary ml-auto">本月累计</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {CALL_RANKING.map((item) => (
              <div
                key={item.rank}
                className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    backgroundColor:
                      item.rank <= 3 ? 'var(--brand-main)' : 'var(--bg-elevated)',
                    color: item.rank <= 3 ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {item.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <span>{formatNumber(item.calls)} 次</span>
                    <span>·</span>
                    <span>{formatCurrency(item.cost)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs shrink-0">
                  <TrendingUp
                    size={12}
                    className={item.trend >= 0 ? 'text-green-500' : 'text-red-500 rotate-180'}
                  />
                  <span className={item.trend >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {Math.abs(item.trend)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Model Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={selectedModel?.name ?? '模型详情'}
        description={selectedModel ? `${selectedModel.vendor} · ${selectedModel.channel}` : undefined}
        width="md"
      >
        {selectedModel && (
          <div className="space-y-6">
            {/* Drawer Tabs */}
            <div
              className="flex gap-1 p-1 rounded-lg"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              {[
                { id: 'info' as const, label: '基本信息', icon: <Info size={14} /> },
                { id: 'pricing' as const, label: '定价配置', icon: <DollarSign size={14} /> },
                { id: 'visibility' as const, label: '可见性策略', icon: <Shield size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all"
                  style={{
                    backgroundColor: drawerTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                    color: drawerTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: drawerTab === tab.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Info Tab */}
            {drawerTab === 'info' && (
              <div className="space-y-4">
                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_CONFIG[selectedModel.status].variant} size="md">
                    {STATUS_CONFIG[selectedModel.status].label}
                  </Badge>
                  <Badge variant={HEALTH_CONFIG[selectedModel.health].variant}>
                    {HEALTH_CONFIG[selectedModel.health].label}
                  </Badge>
                  <span
                    className="px-2 py-0.5 text-xs rounded border"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {selectedModel.type}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-secondary">{selectedModel.description}</p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-xs text-secondary">今日调用</div>
                    <div className="text-lg font-bold mt-1">{formatNumber(selectedModel.todayCalls)}</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-xs text-secondary">本月调用</div>
                    <div className="text-lg font-bold mt-1">{formatNumber(selectedModel.monthCalls)}</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-xs text-secondary">本月消耗</div>
                    <div className="text-lg font-bold mt-1">{formatCurrency(selectedModel.monthCost)}</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="text-xs text-secondary">成功率</div>
                    <div className="text-lg font-bold mt-1">{selectedModel.successRate}%</div>
                  </div>
                </div>

                {/* Basic Info */}
                <Card>
                  <h4 className="font-bold mb-3">技术参数</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">供应商</span>
                      <span>{selectedModel.vendor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">渠道</span>
                      <span>{selectedModel.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">上下文窗口</span>
                      <span className="font-mono">{selectedModel.contextWindow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">平均延迟</span>
                      <span className="font-mono">{selectedModel.avgLatency}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">最后更新</span>
                      <span>{selectedModel.lastUpdated}</span>
                    </div>
                  </div>
                </Card>

                {/* Remaining Quota */}
                <Card>
                  <h4 className="font-bold mb-3">剩余额度</h4>
                  <div className="text-2xl font-black mb-2">{selectedModel.remaining}</div>
                  <div
                    className="w-full h-3 rounded-full"
                    style={{ background: 'var(--border-color)' }}
                  >
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${100 - selectedModel.usedPercent}%`,
                        background: getBarColor(selectedModel),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-secondary mt-1">
                    <span>已用 {selectedModel.usedPercent}%</span>
                    <span>剩余 {100 - selectedModel.usedPercent}%</span>
                  </div>
                </Card>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" icon={<Pencil size={16} />}>
                    编辑配置
                  </Button>
                  <Button variant="secondary" className="flex-1" icon={<Copy size={16} />}>
                    复制模型名
                  </Button>
                </div>
              </div>
            )}

            {/* Pricing Tab */}
            {drawerTab === 'pricing' && (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={16} className="text-brand-main" />
                    <h4 className="font-bold">当前定价方案</h4>
                  </div>
                  <div className="text-sm text-secondary mb-4">
                    {selectedModel.pricing.name}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-secondary mb-1">输入价格</div>
                      <div className="text-2xl font-black text-brand-main">
                        ${selectedModel.pricing.inputPrice}
                      </div>
                      <div className="text-xs text-secondary">{selectedModel.pricing.unit}</div>
                    </div>
                    {selectedModel.pricing.outputPrice > 0 && (
                      <div>
                        <div className="text-xs text-secondary mb-1">输出价格</div>
                        <div className="text-2xl font-black text-brand-accent">
                          ${selectedModel.pricing.outputPrice}
                        </div>
                        <div className="text-xs text-secondary">{selectedModel.pricing.unit}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost Analysis */}
                <Card>
                  <h4 className="font-bold mb-3">成本分析</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">本月总消耗</span>
                      <span className="font-bold">{formatCurrency(selectedModel.monthCost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">本月总调用</span>
                      <span className="font-mono">{formatNumber(selectedModel.monthCalls)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">平均每次调用成本</span>
                      <span className="font-mono">
                        {formatCurrency(selectedModel.monthCost / selectedModel.monthCalls)}
                      </span>
                    </div>
                    <div
                      className="h-px"
                      style={{ backgroundColor: 'var(--border-color)' }}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">预测下月消耗</span>
                      <span className="font-bold text-brand-accent">
                        {formatCurrency(selectedModel.monthCost * 1.1)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Pricing Tiers */}
                <Card>
                  <h4 className="font-bold mb-3">可用定价方案</h4>
                  <div className="space-y-2">
                    <div
                      className="p-3 rounded-lg border-2"
                      style={{ borderColor: 'var(--brand-main)', background: 'var(--bg-elevated)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">标准定价</div>
                          <div className="text-xs text-secondary">默认方案，按量计费</div>
                        </div>
                        <Badge variant="success">当前使用</Badge>
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-lg border cursor-pointer hover:border-brand-main transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">批量折扣</div>
                          <div className="text-xs text-secondary">月调用 {">"} 1M tokens 享 8 折</div>
                        </div>
                        <ChevronRight size={14} className="text-secondary" />
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-lg border cursor-pointer hover:border-brand-main transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">预留配额</div>
                          <div className="text-xs text-secondary">预购固定配额享 7 折</div>
                        </div>
                        <ChevronRight size={14} className="text-secondary" />
                      </div>
                    </div>
                  </div>
                </Card>

                <Button variant="secondary" className="w-full" icon={<Settings size={16} />}>
                  修改定价方案
                </Button>
              </div>
            )}

            {/* Visibility Tab */}
            {drawerTab === 'visibility' && (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-brand-main" />
                    <h4 className="font-bold">可见性策略</h4>
                  </div>
                  <p className="text-sm text-secondary">
                    控制哪些角色和部门可以使用此模型。未列出的默认不可见。
                  </p>
                </div>

                {/* Role Visibility */}
                <Card>
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Users size={14} />
                    按角色
                  </h4>
                  <div className="space-y-2">
                    {selectedModel.visibility
                      .filter((v) => v.type === 'role')
                      .map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-2 rounded border"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <div className="flex items-center gap-2">
                            {rule.allowed ? (
                              <CheckCircle size={14} className="text-green-500" />
                            ) : (
                              <XCircle size={14} className="text-red-500" />
                            )}
                            <span className="text-sm">{rule.name}</span>
                          </div>
                          <Badge variant={rule.allowed ? 'success' : 'error'} size="sm">
                            {rule.allowed ? '允许' : '禁止'}
                          </Badge>
                        </div>
                      ))}
                    {selectedModel.visibility.filter((v) => v.type === 'role').length === 0 && (
                      <p className="text-sm text-secondary">未配置角色可见性</p>
                    )}
                  </div>
                </Card>

                {/* Department Visibility */}
                <Card>
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Boxes size={14} />
                    按部门
                  </h4>
                  <div className="space-y-2">
                    {selectedModel.visibility
                      .filter((v) => v.type === 'department')
                      .map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-2 rounded border"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <div className="flex items-center gap-2">
                            {rule.allowed ? (
                              <CheckCircle size={14} className="text-green-500" />
                            ) : (
                              <XCircle size={14} className="text-red-500" />
                            )}
                            <span className="text-sm">{rule.name}</span>
                          </div>
                          <Badge variant={rule.allowed ? 'success' : 'error'} size="sm">
                            {rule.allowed ? '允许' : '禁止'}
                          </Badge>
                        </div>
                      ))}
                    {selectedModel.visibility.filter((v) => v.type === 'department').length === 0 && (
                      <p className="text-sm text-secondary">未配置部门可见性</p>
                    )}
                  </div>
                </Card>

                {/* Summary */}
                <div
                  className="p-3 rounded-lg flex items-center gap-3"
                  style={{ backgroundColor: 'var(--brand-main)10', color: 'var(--brand-main)' }}
                >
                  <Eye size={16} />
                  <div className="text-sm">
                    <span className="font-bold">
                      {selectedModel.visibility.filter((v) => v.allowed).length}
                    </span>{' '}
                    个实体有权使用此模型
                  </div>
                </div>

                <Button variant="secondary" className="w-full" icon={<Pencil size={16} />}>
                  编辑可见性策略
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
