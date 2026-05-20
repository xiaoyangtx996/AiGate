import { useState, useMemo } from 'react'
import {
  GitBranch,
  Layers,
  MessageSquare,
  Mail,
  Plus,
  Settings,
  Pencil,
  Puzzle,
  Search,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  CheckCircle2,
  X,
  Database,
  Globe,
  Shield,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useUIStore } from '@/stores/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type HealthStatus = 'healthy' | 'degraded' | 'down'

interface McpTool {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  protocol: 'MCP:REMOTE' | 'MCP:LOCAL'
  auth: string
  status: 'enabled' | 'disabled'
  health: HealthStatus
  version: string
  calls7d: string
  calls7dNum: number
  avgLatency: number
  successRate: number
  lastCheck: string
  isPublic: boolean
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
      <span className={`relative flex h-2.5 w-2.5`}>
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

const MOCK_TOOLS: McpTool[] = [
  {
    id: '1',
    name: 'GitHub API',
    description: '支持代码库搜索、Issue 管理、PR 审查等操作。',
    icon: <GitBranch size={22} />,
    protocol: 'MCP:REMOTE',
    auth: 'OAuth',
    status: 'enabled',
    health: 'healthy',
    version: 'v2.4.1',
    calls7d: '1.2k',
    calls7dNum: 1200,
    avgLatency: 180,
    successRate: 99.7,
    lastCheck: '2 分钟前',
    isPublic: true,
  },
  {
    id: '2',
    name: '飞书文档读写',
    description: '读取/写入飞书文档、电子表格、多维表格。',
    icon: <Layers size={22} />,
    protocol: 'MCP:REMOTE',
    auth: 'AppToken',
    status: 'enabled',
    health: 'degraded',
    version: 'v1.8.0',
    calls7d: '856',
    calls7dNum: 856,
    avgLatency: 420,
    successRate: 96.2,
    lastCheck: '5 分钟前',
    isPublic: true,
  },
  {
    id: '3',
    name: '数据库查询',
    description: '只读查询企业内部 PostgreSQL，用于数据统计辅助。',
    icon: <Database size={22} />,
    protocol: 'MCP:LOCAL',
    auth: '只读',
    status: 'enabled',
    health: 'healthy',
    version: 'v3.1.2',
    calls7d: '3.4k',
    calls7dNum: 3400,
    avgLatency: 45,
    successRate: 99.9,
    lastCheck: '1 分钟前',
    isPublic: false,
  },
  {
    id: '4',
    name: '邮件发送',
    description: '通过 SMTP 发送邮件，供 Agent 执行通知任务。',
    icon: <Mail size={22} />,
    protocol: 'MCP:LOCAL',
    auth: 'SMTP',
    status: 'disabled',
    health: 'down',
    version: 'v1.0.0',
    calls7d: '0',
    calls7dNum: 0,
    avgLatency: 0,
    successRate: 0,
    lastCheck: '30 分钟前',
    isPublic: false,
  },
  {
    id: '5',
    name: 'Slack 消息通知',
    description: '向 Slack 频道推送消息，支持 Block Kit 富文本格式。',
    icon: <MessageSquare size={22} />,
    protocol: 'MCP:REMOTE',
    auth: 'Bot Token',
    status: 'enabled',
    health: 'healthy',
    version: 'v2.0.3',
    calls7d: '2.1k',
    calls7dNum: 2100,
    avgLatency: 210,
    successRate: 99.5,
    lastCheck: '3 分钟前',
    isPublic: true,
  },
  {
    id: '6',
    name: 'Confluence 知识检索',
    description: '检索 Confluence 页面内容，支持 CQL 高级查询语法。',
    icon: <Globe size={22} />,
    protocol: 'MCP:REMOTE',
    auth: 'API Key',
    status: 'enabled',
    health: 'healthy',
    version: 'v1.5.2',
    calls7d: '680',
    calls7dNum: 680,
    avgLatency: 320,
    successRate: 98.8,
    lastCheck: '4 分钟前',
    isPublic: true,
  },
  {
    id: '7',
    name: '内部 API 网关',
    description: '代理调用企业内部 RESTful API，支持自动鉴权和熔断。',
    icon: <Shield size={22} />,
    protocol: 'MCP:LOCAL',
    auth: 'mTLS',
    status: 'enabled',
    health: 'healthy',
    version: 'v4.2.0',
    calls7d: '5.6k',
    calls7dNum: 5600,
    avgLatency: 65,
    successRate: 99.8,
    lastCheck: '1 分钟前',
    isPublic: false,
  },
  {
    id: '8',
    name: 'Jira 工单管理',
    description: '创建、更新、查询 Jira Issue，支持 JQL 搜索和状态流转。',
    icon: <Zap size={22} />,
    protocol: 'MCP:REMOTE',
    auth: 'OAuth',
    status: 'enabled',
    health: 'degraded',
    version: 'v3.0.1',
    calls7d: '430',
    calls7dNum: 430,
    avgLatency: 580,
    successRate: 94.5,
    lastCheck: '8 分钟前',
    isPublic: true,
  },
]

/* ------------------------------------------------------------------ */
/*  Stats computation                                                  */
/* ------------------------------------------------------------------ */

const STATS = {
  totalTools: MOCK_TOOLS.length,
  healthyTools: MOCK_TOOLS.filter((t) => t.health === 'healthy').length,
  degradedTools: MOCK_TOOLS.filter((t) => t.health === 'degraded').length,
  downTools: MOCK_TOOLS.filter((t) => t.health === 'down').length,
  totalCalls7d: MOCK_TOOLS.reduce((sum, t) => sum + t.calls7dNum, 0),
  avgSuccessRate: +(MOCK_TOOLS.filter((t) => t.calls7dNum > 0).reduce((sum, t) => sum + t.successRate, 0) / MOCK_TOOLS.filter((t) => t.calls7dNum > 0).length).toFixed(1),
  topTools: [...MOCK_TOOLS].sort((a, b) => b.calls7dNum - a.calls7dNum).slice(0, 5),
  avgLatency: Math.round(MOCK_TOOLS.filter((t) => t.calls7dNum > 0).reduce((sum, t) => sum + t.avgLatency, 0) / MOCK_TOOLS.filter((t) => t.calls7dNum > 0).length),
}

const TABS = [
  { id: 'public', label: '公共市场', count: MOCK_TOOLS.filter((t) => t.isPublic).length },
  { id: 'private', label: '企业私有库', count: MOCK_TOOLS.filter((t) => !t.isPublic).length },
  { id: 'stats', label: '调用统计' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Mcp() {
  const [activeTab, setActiveTab] = useState('public')
  const [modalOpen, setModalOpen] = useState(false)
  const [protocol, setProtocol] = useState<'stdio' | 'sse'>('stdio')
  const [toolName, setToolName] = useState('')
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ type: string; toolId?: string; toolName?: string } | null>(null)
  const [protocolFilter, setProtocolFilter] = useState<string>('all')
  const [healthFilter, setHealthFilter] = useState<string>('all')
  const { addToast } = useUIStore()

  const hasActiveFilters = protocolFilter !== 'all' || healthFilter !== 'all'

  const clearFilters = () => {
    setProtocolFilter('all')
    setHealthFilter('all')
    setSearch('')
  }

  const filteredTools = useMemo(() => {
    return MOCK_TOOLS.filter((tool) => {
      const matchesTab = activeTab === 'public' ? tool.isPublic : activeTab === 'private' ? !tool.isPublic : true
      const matchesSearch = !search || tool.name.toLowerCase().includes(search.toLowerCase())
      const matchesProtocol = protocolFilter === 'all' || tool.protocol === protocolFilter
      const matchesHealth = healthFilter === 'all' || tool.health === healthFilter
      return matchesTab && matchesSearch && matchesProtocol && matchesHealth
    })
  }, [activeTab, search, protocolFilter, healthFilter])

  const handleRegister = () => {
    if (!toolName.trim()) {
      addToast({ type: 'warning', title: '请输入 MCP 工具名称' })
      return
    }
    addToast({ type: 'success', title: '注册成功', message: `MCP 工具「${toolName}」已成功注册` })
    setModalOpen(false)
    setToolName('')
  }

  const handleDelete = (toolId: string, toolName: string) => {
    setConfirmAction({ type: 'delete', toolId, toolName })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'delete') {
      addToast({ type: 'success', title: '已删除', message: `MCP 工具「${confirmAction.toolName}」已删除` })
    }
    setConfirmAction(null)
  }

  return (
    <div>
      <PageHeader
        title="MCP 工具市场"
        subtitle="注册符合 Model Context Protocol 的工具，供 Agent 动态调用。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'MCP 工具' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            注册工具
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Search & Filters */}
      {activeTab !== 'stats' && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <Input
              placeholder="搜索 MCP 工具..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />

            {/* Protocol filter */}
            <select
              className="input text-sm"
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="all">全部协议</option>
              <option value="MCP:REMOTE">MCP:REMOTE</option>
              <option value="MCP:LOCAL">MCP:LOCAL</option>
            </select>

            {/* Health filter */}
            <select
              className="input text-sm"
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="all">全部健康状态</option>
              <option value="healthy">健康</option>
              <option value="degraded">降级</option>
              <option value="down">故障</option>
            </select>

            {/* Active filter indicator */}
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

            {/* Filter count */}
            <span className="text-xs text-secondary ml-auto">
              共 <strong style={{ color: 'var(--text-primary)' }}>{filteredTools.length}</strong> 个工具
            </span>
          </div>
        </div>
      )}

      {/* Tool Grid */}
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
                <span className="text-xs text-secondary">工具总数</span>
              </div>
              <div className="text-2xl font-bold">{STATS.totalTools}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: '#10b981' }}>{STATS.healthyTools} 健康</span>
                <span className="text-xs text-secondary">/</span>
                <span className="text-xs" style={{ color: '#f59e0b' }}>{STATS.degradedTools} 降级</span>
                <span className="text-xs text-secondary">/</span>
                <span className="text-xs" style={{ color: '#ef4444' }}>{STATS.downTools} 故障</span>
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
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} style={{ color: '#10b981' }} />
                <span className="text-xs" style={{ color: '#10b981' }}>较上周 +12.3%</span>
              </div>
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
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} style={{ color: '#10b981' }} />
                <span className="text-xs" style={{ color: '#10b981' }}>较上周 +0.5%</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <Clock size={18} />
                </div>
                <span className="text-xs text-secondary">平均延迟</span>
              </div>
              <div className="text-2xl font-bold">{STATS.avgLatency}ms</div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowDownRight size={12} style={{ color: '#10b981' }} />
                <span className="text-xs" style={{ color: '#10b981' }}>较上周 -8ms</span>
              </div>
            </Card>
          </div>

          {/* Top 5 Tools by Calls */}
          <Card>
            <CardHeader>
              <CardTitle>调用排行 Top 5</CardTitle>
              <span className="text-xs text-secondary">近 7 天</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {STATS.topTools.map((tool, idx) => {
                  const maxCalls = STATS.topTools[0].calls7dNum
                  const barWidth = maxCalls > 0 ? (tool.calls7dNum / maxCalls) * 100 : 0
                  return (
                    <div key={tool.id} className="flex items-center gap-4">
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
                          <span className="text-sm font-medium truncate">{tool.name}</span>
                          <span className="text-sm font-bold shrink-0 ml-2">{tool.calls7d}</span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--bg-elevated)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              background: idx === 0 ? 'var(--brand-main)' : 'var(--brand-accent)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-secondary shrink-0 w-16 text-right">
                        {tool.avgLatency}ms
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-tool detail table */}
          <Card>
            <CardHeader>
              <CardTitle>工具明细</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">工具名称</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">协议</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">版本</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">健康状态</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-secondary">调用量</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-secondary">成功率</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-secondary">平均延迟</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_TOOLS.map((tool) => (
                      <tr key={tool.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span style={{ color: 'var(--brand-main)' }}>{tool.icon}</span>
                            <span className="font-medium">{tool.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-color)' }}>
                            {tool.protocol}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-secondary">{tool.version}</td>
                        <td className="py-3 px-2">
                          <HealthDot status={tool.health} />
                        </td>
                        <td className="py-3 px-2 text-right font-medium">{tool.calls7d}</td>
                        <td className="py-3 px-2 text-right">
                          <span style={{ color: tool.successRate >= 99 ? '#10b981' : tool.successRate >= 95 ? '#f59e0b' : '#ef4444' }}>
                            {tool.successRate}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-secondary">{tool.avgLatency > 0 ? `${tool.avgLatency}ms` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : filteredTools.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="暂无 MCP 工具"
          description={
            hasActiveFilters
              ? '没有符合筛选条件的工具，请调整筛选项'
              : activeTab === 'public'
                ? '公共市场暂无可用工具'
                : '还没有注册任何私有工具'
          }
          action={
            hasActiveFilters
              ? { label: '清除筛选', onClick: clearFilters }
              : activeTab === 'private'
                ? { label: '注册工具', onClick: () => setModalOpen(true) }
                : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <Card key={tool.id} hover className="flex flex-col hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl border flex items-center justify-center"
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--brand-main)',
                  }}
                >
                  {tool.icon}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tool.status === 'enabled' ? 'success' : 'warning'}>
                    {tool.status === 'enabled' ? '已启用' : '已停用'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base">{tool.name}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {tool.version}
                </span>
              </div>
              <p className="text-secondary text-sm flex-1 mb-4">{tool.description}</p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="badge-neutral text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-color)' }}>{tool.protocol}</span>
                <span className="badge-neutral text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-color)' }}>认证: {tool.auth}</span>
              </div>
              {/* Health & Metrics Row */}
              <div
                className="flex items-center gap-4 mb-3 pb-3 border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <HealthDot status={tool.health} />
                {tool.calls7dNum > 0 && (
                  <>
                    <span className="text-xs text-secondary">
                      成功率 <strong style={{ color: tool.successRate >= 99 ? '#10b981' : '#f59e0b' }}>{tool.successRate}%</strong>
                    </span>
                    <span className="text-xs text-secondary">
                      延迟 <strong style={{ color: 'var(--text-primary)' }}>{tool.avgLatency}ms</strong>
                    </span>
                  </>
                )}
              </div>
              {/* Footer */}
              <div
                className="flex justify-between items-center"
              >
                <span className="text-xs text-secondary">
                  近7天调用:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{tool.calls7d}</strong>
                </span>
                <div className="flex gap-3">
                  <button className="text-xs font-bold text-secondary hover:text-primary cursor-pointer">
                    <Pencil size={12} className="inline mr-1" />
                    编辑
                  </button>
                  <button className="text-xs font-bold text-brand-main hover:underline cursor-pointer">
                    <Settings size={12} className="inline mr-1" />
                    配置
                  </button>
                  <button
                    className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(tool.id, tool.name)
                    }}
                  >
                    <Trash2 size={12} className="inline mr-1" />
                    删除
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title="确认删除 MCP 工具"
        description={`删除后 MCP 工具「${confirmAction?.toolName}」的所有配置将被清除，此操作不可逆。`}
        confirmText="删除"
        variant="danger"
      />

      {/* Register Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="注册新 MCP 工具"
        description="支持 Model Context Protocol 规范的 stdio 命令行二进制、HTTP SSE 端点及安全隔离运行。"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="工具名称"
              placeholder="例如：Slack Connector"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
            />
            <div className="w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                连接器协议
              </label>
              <select
                className="input"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as 'stdio' | 'sse')}
              >
                <option value="stdio">Local Stdio (命令行二进制)</option>
                <option value="sse">Remote SSE (HTTP Server-Sent Events)</option>
              </select>
            </div>
          </div>
          {protocol === 'stdio' ? (
            <Input label="启动命令" placeholder="例如：npx @anthropic/mcp-github" />
          ) : (
            <Input label="服务 URL" placeholder="例如：https://api.example.com/mcp" />
          )}
          <Input label="认证 Token" placeholder="请输入访问凭证（可选）" />
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>沙箱策略</label>
              <select className="input"><option>严格隔离（只读文件系统）</option></select>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>可见范围</label>
              <select className="input"><option>全员可用</option></select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={handleRegister}>提交注册</Button>
        </div>
      </Modal>
    </div>
  )
}
