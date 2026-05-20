import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { Tabs } from '@/components/ui/Tabs'
import { Timeline } from '@/components/ui/Timeline'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'
import {
  Download,
  Search,
  FileText,
  Copy,
  Clock,
  Cpu,
  Zap,
  DollarSign,
  RefreshCw,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LogEntry {
  id: string
  time: string
  type: 'chat' | 'image' | 'agent'
  keyId: string
  keyName: string
  userId: string
  userName: string
  department: string
  model: string
  tokens: { input: number; output: number; cached?: number }
  latency: number
  cost: number
  status: 'success' | 'error' | 'rate_limited'
  statusCode: number
  prompt?: string
  response?: string
  errorMessage?: string
  timeline?: {
    id: string
    title: string
    time: string
    status: 'success' | 'active' | 'error' | 'pending'
    description?: string
  }[]
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const mockLogs: LogEntry[] = [
  {
    id: '1',
    time: '2026-05-20 14:32:15',
    type: 'chat',
    keyId: 'ag-prod-8f2c',
    keyName: 'Cursor 专用',
    userId: '1',
    userName: '张三',
    department: 'AI 架构部',
    model: 'gpt-4o',
    tokens: { input: 1420, output: 680, cached: 200 },
    latency: 1200,
    cost: 0.042,
    status: 'success',
    statusCode: 200,
    prompt: '请帮我用 HTML/JS 写一个滑出抽屉组件的代码。',
    response: '这是一段滑出抽屉的实现：通过 CSS transform translate-x-full 进行控制...',
    timeline: [
      { id: '1', title: '请求接收', time: '14:32:15.100', status: 'success' },
      { id: '2', title: '身份验证', time: '14:32:15.150', status: 'success', description: 'Key 验证通过' },
      { id: '3', title: '配额检查', time: '14:32:15.200', status: 'success', description: '配额充足' },
      { id: '4', title: '模型转发', time: '14:32:15.250', status: 'success', description: '转发至 OpenAI' },
      { id: '5', title: '响应返回', time: '14:32:16.300', status: 'success', description: '1200ms' },
    ],
  },
  {
    id: '2',
    time: '2026-05-20 14:28:03',
    type: 'chat',
    keyId: 'ag-prod-8f2c',
    keyName: 'Cursor 专用',
    userId: '1',
    userName: '张三',
    department: 'AI 架构部',
    model: 'claude-3-5-sonnet',
    tokens: { input: 2100, output: 1200 },
    latency: 3400,
    cost: 0.085,
    status: 'success',
    statusCode: 200,
    prompt: '请审查这段 Python 代码的内存泄漏漏洞。',
    response: '我审查了您提供的 Python 代码，发现在多线程处理中使用全局 list 累积数据...',
  },
  {
    id: '3',
    time: '2026-05-20 14:15:42',
    type: 'chat',
    keyId: 'ag-dev-3a1b',
    keyName: '测试 Key',
    userId: '2',
    userName: '李四',
    department: '前端开发组',
    model: 'gpt-4o',
    tokens: { input: 520, output: 180 },
    latency: 800,
    cost: 0.015,
    status: 'success',
    statusCode: 200,
  },
  {
    id: '4',
    time: '2026-05-20 13:55:20',
    type: 'chat',
    keyId: 'ag-prod-8f2c',
    keyName: 'Cursor 专用',
    userId: '1',
    userName: '张三',
    department: 'AI 架构部',
    model: 'gpt-4o',
    tokens: { input: 3200, output: 0 },
    latency: 0,
    cost: 0,
    status: 'rate_limited',
    statusCode: 429,
    errorMessage: '触发了部门单日频次限制阈值',
    timeline: [
      { id: '1', title: '请求接收', time: '13:55:20.100', status: 'success' },
      { id: '2', title: '身份验证', time: '13:55:20.150', status: 'success' },
      { id: '3', title: '配额检查', time: '13:55:20.200', status: 'error', description: '配额不足' },
      { id: '4', title: '请求拒绝', time: '13:55:20.250', status: 'error', description: '429 Rate Limited' },
    ],
  },
  {
    id: '5',
    time: '2026-05-20 13:40:10',
    type: 'agent',
    keyId: '-',
    keyName: '-',
    userId: '3',
    userName: '王五',
    department: '产品部',
    model: 'gpt-4o',
    tokens: { input: 4500, output: 2800 },
    latency: 8500,
    cost: 0.185,
    status: 'success',
    statusCode: 200,
    prompt: '帮我分析一下本月的用户增长趋势',
    response: '根据数据分析，本月用户增长率为 15.2%...',
  },
  {
    id: '6',
    time: '2026-05-20 12:20:05',
    type: 'image',
    keyId: 'ag-prod-8f2c',
    keyName: 'Cursor 专用',
    userId: '1',
    userName: '张三',
    department: 'AI 架构部',
    model: 'dall-e-3',
    tokens: { input: 100, output: 0 },
    latency: 15000,
    cost: 0.08,
    status: 'success',
    statusCode: 200,
  },
]

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LOG_TABS = [
  { id: 'all', label: '全部', count: mockLogs.length },
  { id: 'chat', label: 'AI 调用', count: mockLogs.filter((l) => l.type === 'chat').length },
  { id: 'image', label: '生图调用', count: mockLogs.filter((l) => l.type === 'image').length },
  { id: 'agent', label: 'Agent 对话', count: mockLogs.filter((l) => l.type === 'agent').length },
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  success: { label: '成功', variant: 'success' },
  error: { label: '失败', variant: 'error' },
  rate_limited: { label: '限流', variant: 'warning' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Logs() {
  const { addToast } = useUIStore()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('today')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Filter logs
  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      const matchesTab = activeTab === 'all' || log.type === activeTab
      const matchesSearch =
        !search ||
        log.userName.includes(search) ||
        log.keyName.includes(search) ||
        log.model.includes(search) ||
        log.prompt?.includes(search)
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter
      const matchesModel = modelFilter === 'all' || log.model === modelFilter
      const matchesDept = departmentFilter === 'all' || log.department === departmentFilter
      return matchesTab && matchesSearch && matchesStatus && matchesModel && matchesDept
    })
  }, [activeTab, search, statusFilter, modelFilter, departmentFilter])

  // Stats
  const stats = useMemo(() => {
    const total = filteredLogs.length
    const success = filteredLogs.filter((l) => l.status === 'success').length
    const totalTokens = filteredLogs.reduce((sum, l) => sum + l.tokens.input + l.tokens.output, 0)
    const totalCost = filteredLogs.reduce((sum, l) => sum + l.cost, 0)
    const avgLatency = filteredLogs.length > 0
      ? Math.round(filteredLogs.reduce((sum, l) => sum + l.latency, 0) / filteredLogs.length)
      : 0
    return { total, success, totalTokens, totalCost, avgLatency }
  }, [filteredLogs])

  // Get unique values for filters
  const models = [...new Set(mockLogs.map((l) => l.model))]
  const departments = [...new Set(mockLogs.map((l) => l.department))]

  // Open detail drawer
  const openDetail = (log: LogEntry) => {
    setSelectedLog(log)
    setDrawerOpen(true)
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: '复制成功' })
  }

  // Export
  const handleExport = () => {
    addToast({ type: 'success', title: '导出成功', message: `已导出 ${filteredLogs.length} 条日志` })
  }

  // Format latency
  const formatLatency = (ms: number) => {
    if (ms >= 1000) return (ms / 1000).toFixed(1) + 's'
    return ms + 'ms'
  }

  // Format tokens
  const formatTokens = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div>
      <PageHeader
        title="调用日志"
        subtitle="查看所有 AI 调用、MCP 调用和 Agent 对话的详细日志。"
        breadcrumbs={[{ label: '网关接入' }, { label: '调用日志' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<RefreshCw size={16} />}>
              刷新
            </Button>
            <Button variant="secondary" icon={<Download size={16} />} onClick={handleExport}>
              导出 CSV
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs text-secondary mb-1">总请求数</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-secondary mb-1">成功率</div>
          <div className="text-2xl font-bold text-brand-main">
            {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-secondary mb-1">总 Tokens</div>
          <div className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-secondary mb-1">总费用</div>
          <div className="text-2xl font-bold">¥ {stats.totalCost.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-secondary mb-1">平均延迟</div>
          <div className="text-2xl font-bold">{formatLatency(stats.avgLatency)}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={LOG_TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />

      <Card className="p-0 overflow-hidden">
        {/* Filter Bar */}
        <div
          className="p-4 border-b flex flex-wrap gap-3 items-center"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="w-48">
            <Input
              placeholder="搜索用户/密钥/模型..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-28"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">今天</option>
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="all">全部</option>
          </select>
          <select
            className="input w-28"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="success">成功</option>
            <option value="error">失败</option>
            <option value="rate_limited">限流</option>
          </select>
          <select
            className="input w-32"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
          >
            <option value="all">全部模型</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="input w-36"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">全部部门</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2 text-xs text-secondary">
            <Clock size={12} />
            <span>最后更新: 30 秒前</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">时间</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">用户 / 密钥</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">模型</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Tokens</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">延迟</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">费用</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">状态</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredLogs.map((log) => {
                const statusConfig = STATUS_CONFIG[log.status]
                return (
                  <tr
                    key={log.id}
                    className="border-b transition-colors hover:bg-elevated cursor-pointer"
                    style={{ borderColor: 'var(--border-color)' }}
                    onClick={() => openDetail(log)}
                  >
                    <td className="p-4">
                      <div className="text-secondary text-xs">{log.time}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{log.userName}</div>
                      <div className="text-xs text-secondary font-mono">{log.keyName}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-secondary" />
                        <span>{log.model}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs">
                        <span className="text-brand-main">{formatTokens(log.tokens.input)}</span>
                        <span className="text-secondary"> / </span>
                        <span>{formatTokens(log.tokens.output)}</span>
                      </div>
                      {log.tokens.cached && (
                        <div className="text-xs text-secondary mt-0.5">缓存: {formatTokens(log.tokens.cached)}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`font-mono ${log.latency > 3000 ? 'text-brand-accent' : ''}`}>
                        {formatLatency(log.latency)}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">
                      ¥ {log.cost.toFixed(4)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={statusConfig.variant}>{log.statusCode}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <EmptyState
            icon={FileText}
            title="暂无日志"
            description="没有匹配的调用日志"
          />
        )}
      </Card>

      {/* Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="调用详情"
        width="md"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Badge variant={STATUS_CONFIG[selectedLog.status].variant} size="md">
                {selectedLog.statusCode} {STATUS_CONFIG[selectedLog.status].label}
              </Badge>
              <span className="text-xs text-secondary">{selectedLog.time}</span>
            </div>

            {/* Basic Info */}
            <Card>
              <h4 className="font-bold mb-3">基本信息</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-secondary" />
                  <span className="text-secondary">模型</span>
                  <span className="font-medium">{selectedLog.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-secondary" />
                  <span className="text-secondary">延迟</span>
                  <span className="font-mono">{formatLatency(selectedLog.latency)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-secondary" />
                  <span className="text-secondary">Tokens</span>
                  <span className="font-mono">{formatTokens(selectedLog.tokens.input + selectedLog.tokens.output)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-secondary" />
                  <span className="text-secondary">费用</span>
                  <span className="font-mono">¥ {selectedLog.cost.toFixed(4)}</span>
                </div>
              </div>
            </Card>

            {/* Token Breakdown */}
            <Card>
              <h4 className="font-bold mb-3">Token 明细</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">输入 Tokens</span>
                  <span className="font-mono">{selectedLog.tokens.input.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">输出 Tokens</span>
                  <span className="font-mono">{selectedLog.tokens.output.toLocaleString()}</span>
                </div>
                {selectedLog.tokens.cached && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">缓存 Tokens</span>
                    <span className="font-mono text-brand-main">{selectedLog.tokens.cached.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t flex justify-between text-sm font-bold" style={{ borderColor: 'var(--border-color)' }}>
                  <span>总计</span>
                  <span className="font-mono">{(selectedLog.tokens.input + selectedLog.tokens.output).toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Request/Response */}
            {selectedLog.prompt && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">用户输入</h4>
                  <button
                    onClick={() => copyToClipboard(selectedLog.prompt || '')}
                    className="text-xs text-brand-main hover:underline flex items-center gap-1"
                  >
                    <Copy size={12} /> 复制
                  </button>
                </div>
                <div
                  className="p-3 rounded-lg text-sm leading-relaxed"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  {selectedLog.prompt}
                </div>
              </Card>
            )}

            {selectedLog.response && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">模型响应</h4>
                  <button
                    onClick={() => copyToClipboard(selectedLog.response || '')}
                    className="text-xs text-brand-main hover:underline flex items-center gap-1"
                  >
                    <Copy size={12} /> 复制
                  </button>
                </div>
                <div
                  className="p-3 rounded-lg text-sm leading-relaxed font-mono"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  {selectedLog.response}
                </div>
              </Card>
            )}

            {/* Error */}
            {selectedLog.errorMessage && (
              <Card>
                <h4 className="font-bold mb-3 text-red-500">错误信息</h4>
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--error) 10%, var(--bg-surface))' }}
                >
                  {selectedLog.errorMessage}
                </div>
              </Card>
            )}

            {/* Timeline */}
            {selectedLog.timeline && selectedLog.timeline.length > 0 && (
              <Card>
                <h4 className="font-bold mb-3">调用链路</h4>
                <Timeline items={selectedLog.timeline} />
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
