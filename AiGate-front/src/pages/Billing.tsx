import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { LineChart } from '@/components/charts/LineChart'
import { PieChart } from '@/components/charts/PieChart'
import { BarChart } from '@/components/charts/BarChart'
import {
  Download,
  TrendingUp,
  BarChart3,
  Layers,
  Users,
  Bot,
  Calendar,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DrillDimension = 'org' | 'employee' | 'model' | 'mcp' | 'agent' | 'date'

interface BillingRecord {
  id: string
  date: string
  org: string
  employee: string
  model: string
  modelType: string
  key: string
  inputTokens: number
  outputTokens: number
  calls: number
  cost: number
  mcp?: string
  agent?: string
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const billingRecords: BillingRecord[] = [
  { id: '1', date: '2026-05-20', org: '北京研发中心', employee: '张三', model: 'gpt-4o', modelType: 'Chat', key: 'ag-prod-a8f2', inputTokens: 245000, outputTokens: 98000, calls: 1248, cost: 5820, mcp: 'code-review', agent: 'CodeBot' },
  { id: '2', date: '2026-05-20', org: '北京研发中心', employee: '李四', model: 'claude-3-5-sonnet', modelType: 'Chat', key: 'ag-prod-b3c1', inputTokens: 180000, outputTokens: 72000, calls: 890, cost: 3240, mcp: 'doc-search', agent: 'DocBot' },
  { id: '3', date: '2026-05-19', org: '上海分公司', employee: '王五', model: 'dall-e-3', modelType: 'Image', key: 'ag-prod-c9d4', inputTokens: 0, outputTokens: 0, calls: 248, cost: 2100, agent: 'DesignBot' },
  { id: '4', date: '2026-05-19', org: '北京研发中心', employee: '赵六', model: 'gemini-1.5-pro', modelType: 'Chat', key: 'ag-prod-d5e6', inputTokens: 95000, outputTokens: 38000, calls: 420, cost: 1290, mcp: 'data-query' },
  { id: '5', date: '2026-05-18', org: '深圳分公司', employee: '孙七', model: 'gpt-4o', modelType: 'Chat', key: 'ag-prod-e7f8', inputTokens: 120000, outputTokens: 48000, calls: 560, cost: 2450 },
  { id: '6', date: '2026-05-18', org: '北京研发中心', employee: '张三', model: 'claude-3-5-sonnet', modelType: 'Chat', key: 'ag-prod-a8f2', inputTokens: 65000, outputTokens: 26000, calls: 340, cost: 1180, mcp: 'code-review' },
  { id: '7', date: '2026-05-17', org: '上海分公司', employee: '周八', model: 'gpt-4o', modelType: 'Chat', key: 'ag-prod-f9g0', inputTokens: 88000, outputTokens: 35200, calls: 450, cost: 1980, agent: 'SupportBot' },
  { id: '8', date: '2026-05-17', org: '深圳分公司', employee: '吴九', model: 'sora-turbo', modelType: 'Video', key: 'ag-prod-h1i2', inputTokens: 0, outputTokens: 0, calls: 12, cost: 1500 },
  { id: '9', date: '2026-05-16', org: '北京研发中心', employee: '李四', model: 'gpt-4o', modelType: 'Chat', key: 'ag-prod-b3c1', inputTokens: 155000, outputTokens: 62000, calls: 780, cost: 3480, mcp: 'doc-search', agent: 'DocBot' },
  { id: '10', date: '2026-05-16', org: '上海分公司', employee: '王五', model: 'gpt-4o', modelType: 'Chat', key: 'ag-prod-c9d4', inputTokens: 72000, outputTokens: 28800, calls: 380, cost: 1620 },
  { id: '11', date: '2026-05-15', org: '北京研发中心', employee: '赵六', model: 'claude-3-5-sonnet', modelType: 'Chat', key: 'ag-prod-d5e6', inputTokens: 110000, outputTokens: 44000, calls: 520, cost: 2380, agent: 'CodeBot' },
  { id: '12', date: '2026-05-15', org: '深圳分公司', employee: '孙七', model: 'dall-e-3', modelType: 'Image', key: 'ag-prod-e7f8', inputTokens: 0, outputTokens: 0, calls: 180, cost: 1530 },
  { id: '13', date: '2026-05-14', org: '北京研发中心', employee: '张三', model: 'gpt-4o', modelType: 'Chat', key: 'ag-prod-a8f2', inputTokens: 198000, outputTokens: 79200, calls: 1020, cost: 4440, mcp: 'code-review', agent: 'CodeBot' },
  { id: '14', date: '2026-05-14', org: '上海分公司', employee: '周八', model: 'gemini-1.5-pro', modelType: 'Chat', key: 'ag-prod-f9g0', inputTokens: 42000, outputTokens: 16800, calls: 210, cost: 570 },
  { id: '15', date: '2026-05-13', org: '深圳分公司', employee: '吴九', model: 'gpt-4o', modelType: 'Chat', key: 'ag-prod-h1i2', inputTokens: 67000, outputTokens: 26800, calls: 340, cost: 1500, agent: 'SupportBot' },
]

const tokenTrend = {
  dates: ['05-13', '05-14', '05-15', '05-16', '05-17', '05-18', '05-19', '05-20'],
  series: [
    { name: 'gpt-4o', data: [1.8, 3.2, 2.1, 2.8, 1.5, 2.0, 1.6, 3.8], color: '#10b981' },
    { name: 'claude-3-5-sonnet', data: [0.9, 1.5, 1.8, 1.2, 0.8, 1.0, 0.5, 2.8], color: '#f59e0b' },
    { name: 'gemini-1.5-pro', data: [0.3, 0.5, 0.4, 0.6, 0.3, 0.2, 0.4, 1.5], color: '#6366f1' },
    { name: '其他', data: [0.2, 0.3, 0.5, 0.3, 0.4, 0.6, 0.2, 0.3], color: '#8b5cf6' },
  ],
}

const dimensionTabs = [
  { id: 'org', label: '按组织', icon: <Layers size={14} /> },
  { id: 'employee', label: '按员工', icon: <Users size={14} /> },
  { id: 'model', label: '按模型', icon: <Bot size={14} /> },
  { id: 'mcp', label: '按 MCP', icon: <Layers size={14} /> },
  { id: 'agent', label: '按 Agent', icon: <Bot size={14} /> },
  { id: 'date', label: '按日期', icon: <Calendar size={14} /> },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCost(cost: number): string {
  return `¥ ${cost.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`
  return tokens.toString()
}

function aggregateBy(records: BillingRecord[], key: keyof BillingRecord) {
  const map = new Map<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }>()
  for (const r of records) {
    const groupKey = String(r[key] ?? '未关联')
    const existing = map.get(groupKey) ?? { cost: 0, inputTokens: 0, outputTokens: 0, calls: 0 }
    existing.cost += r.cost
    existing.inputTokens += r.inputTokens
    existing.outputTokens += r.outputTokens
    existing.calls += r.calls
    map.set(groupKey, existing)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].cost - a[1].cost)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Billing() {
  const [period, setPeriod] = useState('本月')
  const [org, setOrg] = useState('全部')
  const [modelType, setModelType] = useState('全部')
  const [drillDim, setDrillDim] = useState<DrillDimension>('org')
  const [drillPath, setDrillPath] = useState<string[]>([])

  /* Filtered records */
  const filteredRecords = useMemo(() => {
    let result = [...billingRecords]
    if (org !== '全部') result = result.filter((r) => r.org === org)
    if (modelType !== '全部') result = result.filter((r) => r.modelType === modelType)
    return result
  }, [org, modelType])

  /* Aggregation for pivot table */
  const pivotData = useMemo(() => {
    return aggregateBy(filteredRecords, drillDim === 'date' ? 'date' : drillDim)
  }, [filteredRecords, drillDim])

  /* KPI summary */
  const kpiSummary = useMemo(() => {
    const totalCost = filteredRecords.reduce((s, r) => s + r.cost, 0)
    const totalInput = filteredRecords.reduce((s, r) => s + r.inputTokens, 0)
    const totalOutput = filteredRecords.reduce((s, r) => s + r.outputTokens, 0)
    const totalCalls = filteredRecords.reduce((s, r) => s + r.calls, 0)
    const uniqueKeys = new Set(filteredRecords.map((r) => r.key)).size
    const uniqueModels = new Set(filteredRecords.map((r) => r.model)).size
    return { totalCost, totalInput, totalOutput, totalCalls, uniqueKeys, uniqueModels }
  }, [filteredRecords])

  /* Model distribution for pie chart */
  const modelPieData = useMemo(() => {
    const agg = aggregateBy(filteredRecords, 'model')
    return agg.map(([name, data]) => ({
      name,
      value: data.cost,
    }))
  }, [filteredRecords])

  /* Department ranking for bar chart */
  const deptBarData = useMemo(() => {
    const agg = aggregateBy(filteredRecords, 'org')
    return {
      categories: agg.map(([name]) => name),
      series: [
        {
          name: '消耗金额 (¥)',
          data: agg.map(([, d]) => d.cost),
        },
      ],
    }
  }, [filteredRecords])

  /* Cost attribution: model -> agent/MCP */
  const costAttribution = useMemo(() => {
    const withAgent = filteredRecords.filter((r) => r.agent).reduce((s, r) => s + r.cost, 0)
    const withMcp = filteredRecords.filter((r) => r.mcp).reduce((s, r) => s + r.cost, 0)
    const direct = filteredRecords.filter((r) => !r.agent && !r.mcp).reduce((s, r) => s + r.cost, 0)
    return [
      { name: 'Agent 调用', value: withAgent },
      { name: 'MCP 工具', value: withMcp },
      { name: '直接调用', value: direct },
    ]
  }, [filteredRecords])

  /* Drill-down click handler */
  const handleDrillDown = (item: string) => {
    setDrillPath([...drillPath, item])
  }

  const handleDrillUp = (index: number) => {
    setDrillPath(drillPath.slice(0, index))
  }

  /* Export handler (mock) */
  const handleExport = () => {
    alert('月度报告导出功能：将生成包含 Token 趋势、模型占比、部门排名、明细账单的 Excel 文件。')
  }

  return (
    <div>
      {/* ============================================================ */}
      {/*  Page Header                                                 */}
      {/* ============================================================ */}
      <PageHeader
        title="消耗报表"
        subtitle="按模型、组织、密钥多维度统计 AI 调用费用，支持下钻分析与月报导出。"
        breadcrumbs={[{ label: '网关接入' }, { label: '消耗报表' }]}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2" onClick={handleExport}>
              <FileSpreadsheet size={16} />
              月度报告
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Download size={16} />
              导出 Excel
            </button>
          </div>
        }
      />

      {/* ============================================================ */}
      {/*  KPI Cards                                                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-secondary" />
            <span className="text-xs text-secondary uppercase tracking-widest font-bold">本月总消耗</span>
          </div>
          <div className="text-2xl font-black text-brand-main">{formatCost(kpiSummary.totalCost)}</div>
          <div className="text-xs mt-1 text-brand-main flex items-center gap-1">
            <ArrowUpRight size={12} />
            较上月 +18%
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-secondary" />
            <span className="text-xs text-secondary uppercase tracking-widest font-bold">本月 Tokens</span>
          </div>
          <div className="text-2xl font-black text-brand-main">
            {formatTokens(kpiSummary.totalInput + kpiSummary.totalOutput)}
          </div>
          <div className="text-xs mt-1 text-secondary">
            输入 {formatTokens(kpiSummary.totalInput)} / 输出 {formatTokens(kpiSummary.totalOutput)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-secondary" />
            <span className="text-xs text-secondary uppercase tracking-widest font-bold">调用次数</span>
          </div>
          <div className="text-2xl font-black text-brand-main">{kpiSummary.totalCalls.toLocaleString()}</div>
          <div className="text-xs mt-1 text-secondary">
            {kpiSummary.uniqueModels} 个模型 / {kpiSummary.uniqueKeys} 个 Key
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-secondary" />
            <span className="text-xs text-secondary uppercase tracking-widest font-bold">单次均成本</span>
          </div>
          <div className="text-2xl font-black text-brand-main">
            ¥ {(kpiSummary.totalCost / Math.max(kpiSummary.totalCalls, 1)).toFixed(2)}
          </div>
          <div className="text-xs mt-1 text-brand-accent flex items-center gap-1">
            <ArrowDownRight size={12} />
            较上月 -5%
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Filter Bar                                                  */}
      {/* ============================================================ */}
      <Card className="mb-6 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2 text-secondary">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">筛选条件</span>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">时间段</label>
          <select
            className="input-base w-40"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option>本月</option>
            <option>上月</option>
            <option>最近 7 天</option>
            <option>最近 30 天</option>
            <option>本季度</option>
            <option>自定义</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">组织</label>
          <select
            className="input-base w-44"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          >
            <option>全部</option>
            <option>北京研发中心</option>
            <option>上海分公司</option>
            <option>深圳分公司</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">模型类型</label>
          <select
            className="input-base w-40"
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
          >
            <option>全部</option>
            <option>Chat</option>
            <option>Image</option>
            <option>Video</option>
            <option>Embedding</option>
          </select>
        </div>
        <button className="btn-secondary ml-auto">查询</button>
      </Card>

      {/* ============================================================ */}
      {/*  Charts Row: Token Trend + Model Distribution                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Token Trend - 2/3 width */}
        <Card className="lg:col-span-2 p-6">
          <CardHeader>
            <CardTitle>Token 消耗趋势</CardTitle>
            <span className="text-xs text-secondary">按模型分层，单位：百万 Token</span>
          </CardHeader>
          <LineChart data={tokenTrend} height={280} />
        </Card>

        {/* Model Distribution Pie - 1/3 width */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>模型消耗占比</CardTitle>
          </CardHeader>
          <PieChart data={modelPieData} height={280} />
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Charts Row: Department Ranking + Cost Attribution            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Department Top N */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>组织消耗排名</CardTitle>
            <span className="text-xs text-secondary">按金额降序</span>
          </CardHeader>
          <BarChart data={deptBarData} height={260} yAxisFormatter="¥{value}" />
        </Card>

        {/* Cost Attribution */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>成本归因</CardTitle>
            <span className="text-xs text-secondary">Agent / MCP / 直接调用</span>
          </CardHeader>
          <PieChart data={costAttribution} height={260} />
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Pivot Table with Drill-down                                 */}
      {/* ============================================================ */}
      <Card className="p-0 overflow-hidden mb-6">
        {/* Pivot header with dimension tabs */}
        <div
          className="p-4 border-b flex flex-wrap items-center justify-between gap-4"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm">透视分析</span>
            <Tabs
              tabs={dimensionTabs}
              activeTab={drillDim}
              onChange={(id) => {
                setDrillDim(id as DrillDimension)
                setDrillPath([])
              }}
            />
          </div>
          <span className="text-xs text-secondary">
            共 {filteredRecords.length} 条记录
          </span>
        </div>

        {/* Breadcrumb for drill-down path */}
        {drillPath.length > 0 && (
          <div
            className="px-4 py-2 border-b flex items-center gap-1 text-sm"
            style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.02)' }}
          >
            <button
              className="text-secondary hover:text-primary transition-colors"
              onClick={() => handleDrillUp(0)}
            >
              全部
            </button>
            {drillPath.map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-secondary" />
                <button
                  className="text-secondary hover:text-primary transition-colors"
                  onClick={() => handleDrillUp(i + 1)}
                >
                  {item}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Pivot table */}
        <table className="w-full text-left border-collapse">
          <thead
            className="border-b"
            style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.05)' }}
          >
            <tr>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                {dimensionTabs.find((t) => t.id === drillDim)?.label.replace('按', '') ?? '维度'}
              </th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">消耗金额</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">输入 Token</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">输出 Token</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">调用次数</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">占比</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {pivotData.map(([name, data]) => {
              const percent = ((data.cost / Math.max(kpiSummary.totalCost, 1)) * 100).toFixed(1)
              return (
                <tr
                  key={name}
                  className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <td className="p-4 font-medium">{name}</td>
                  <td className="p-4 text-right font-mono font-bold text-brand-main">{formatCost(data.cost)}</td>
                  <td className="p-4 text-right font-mono text-secondary">{formatTokens(data.inputTokens)}</td>
                  <td className="p-4 text-right font-mono text-secondary">{formatTokens(data.outputTokens)}</td>
                  <td className="p-4 text-right font-mono">{data.calls.toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--border-color)' }}>
                        <div
                          className="h-1.5 rounded-full bg-brand-main"
                          style={{ width: `${Math.min(Number(percent), 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-secondary w-10 text-right">{percent}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      className="text-brand-main hover:underline text-xs flex items-center gap-1 mx-auto"
                      onClick={() => handleDrillDown(name)}
                    >
                      下钻
                      <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {pivotData.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-secondary">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
          {/* Summary row */}
          {pivotData.length > 0 && (
            <tfoot>
              <tr
                className="border-t font-bold text-sm"
                style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.03)' }}
              >
                <td className="p-4">合计</td>
                <td className="p-4 text-right font-mono text-brand-main">{formatCost(kpiSummary.totalCost)}</td>
                <td className="p-4 text-right font-mono text-secondary">{formatTokens(kpiSummary.totalInput)}</td>
                <td className="p-4 text-right font-mono text-secondary">{formatTokens(kpiSummary.totalOutput)}</td>
                <td className="p-4 text-right font-mono">{kpiSummary.totalCalls.toLocaleString()}</td>
                <td className="p-4 text-right text-xs text-secondary">100%</td>
                <td className="p-4" />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      {/* ============================================================ */}
      {/*  Detail Billing Table                                        */}
      {/* ============================================================ */}
      <Card className="p-0 overflow-hidden">
        <div
          className="p-4 border-b font-bold flex justify-between items-center"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span>明细账单</span>
          <span className="text-xs text-secondary font-normal">共 {filteredRecords.length} 条记录</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead
              className="border-b"
              style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.05)' }}
            >
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">日期</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">组织</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">员工</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">调用 Key</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">模型</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">类型</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Token (入/出)</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">调用次数</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">费用</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredRecords.map((row) => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <td className="p-4 text-secondary whitespace-nowrap">{row.date}</td>
                  <td className="p-4 text-secondary">{row.org}</td>
                  <td className="p-4">{row.employee}</td>
                  <td className="p-4 font-mono text-brand-main">{row.key}</td>
                  <td className="p-4">{row.model}</td>
                  <td className="p-4">
                    <Badge variant="neutral">{row.modelType}</Badge>
                  </td>
                  <td className="p-4 font-mono text-secondary">
                    {row.inputTokens > 0
                      ? `${formatTokens(row.inputTokens)} / ${formatTokens(row.outputTokens)}`
                      : '-'}
                  </td>
                  <td className="p-4 text-right font-mono">{row.calls.toLocaleString()}</td>
                  <td className="p-4 text-right font-mono font-bold">{formatCost(row.cost)}</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-secondary">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
