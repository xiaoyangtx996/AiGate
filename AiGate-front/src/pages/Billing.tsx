import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Download, TrendingUp, Image, Key, BarChart3 } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const kpiCards = [
  {
    label: '本月总消耗',
    value: '¥ 12,450',
    sub: '较上月 +18%',
    subColor: 'text-brand-main',
    icon: TrendingUp,
  },
  {
    label: '本月 Tokens',
    value: '48.2 M',
    sub: '输入 32M / 输出 16M',
    subColor: 'text-secondary',
    icon: BarChart3,
  },
  {
    label: '生图次数',
    value: '1,248',
    sub: 'dall-e-3 为主',
    subColor: 'text-secondary',
    icon: Image,
  },
  {
    label: '活跃 Key 数',
    value: '15',
    sub: '共 18 个 Key',
    subColor: 'text-secondary',
    icon: Key,
  },
]

const modelDistribution = [
  { name: 'gpt-4o', cost: '¥ 5,820', percent: 46.8, color: 'var(--brand-main)' },
  { name: 'claude-3-5-sonnet', cost: '¥ 3,240', percent: 26.0, color: 'var(--brand-accent)' },
  { name: 'dall-e-3', cost: '¥ 2,100', percent: 16.9, color: 'var(--brand-main)', opacity: 0.6 },
  { name: 'gemini-1.5-pro', cost: '¥ 1,290', percent: 10.4, color: 'var(--brand-main)', opacity: 0.4 },
]

const departmentTop5 = [
  { name: '北京研发中心', cost: '¥ 5,210', accent: true },
  { name: '架构组', cost: '¥ 3,840' },
  { name: '数据平台部', cost: '¥ 2,100' },
  { name: '产品设计组', cost: '¥ 880' },
  { name: '运维 SRE', cost: '¥ 420' },
]

const billingRows = [
  {
    date: '2026-04-29',
    key: 'ag-rd-a8f2',
    model: 'gpt-4o',
    type: 'Chat',
    usage: '128,450',
    cost: '¥ 128.45',
  },
  {
    date: '2026-04-29',
    key: 'ag-prod-c3d4',
    model: 'dall-e-3',
    type: 'Image',
    usage: '48 张',
    cost: '¥ 96.00',
  },
  {
    date: '2026-04-28',
    key: 'ag-rd-a8f2',
    model: 'sora-turbo',
    type: 'Video',
    usage: '3 个视频',
    cost: '¥ 150.00',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Billing() {
  const [period, setPeriod] = useState('本月')
  const [org, setOrg] = useState('全部')
  const [modelType, setModelType] = useState('全部')

  return (
    <div>
      {/* ============================================================ */}
      {/*  Page Header                                                 */}
      {/* ============================================================ */}
      <PageHeader
        title="消耗报表"
        subtitle="按模型、组织、密钥多维度统计 AI 调用费用，支持导出账单。"
        breadcrumbs={[{ label: '网关接入' }, { label: '消耗报表' }]}
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Download size={16} />
            导出 Excel
          </button>
        }
      />

      {/* ============================================================ */}
      {/*  KPI Cards                                                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-secondary" />
                <span className="text-xs text-secondary uppercase tracking-widest font-bold">
                  {kpi.label}
                </span>
              </div>
              <div className="text-2xl font-black text-brand-main">{kpi.value}</div>
              <div className={`text-xs mt-1 ${kpi.subColor}`}>{kpi.sub}</div>
            </Card>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/*  Filter Bar                                                  */}
      {/* ============================================================ */}
      <Card className="mb-6 p-4 flex flex-wrap gap-4 items-end bg-black/5 dark:bg-white/5">
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
            <option>自定义</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">组织</label>
          <select
            className="input-base w-40"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          >
            <option>全部</option>
            <option>北京研发中心</option>
            <option>架构组</option>
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
      {/*  Charts Row: Model Distribution + Department Top 5           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Model Consumption Distribution */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>模型消耗分布</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {modelDistribution.map((model) => (
              <div key={model.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-secondary">
                    {model.cost} ({model.percent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--border-color)' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${model.percent}%`,
                      background: model.color,
                      opacity: model.opacity ?? 1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Department Consumption Top 5 */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>部门消耗 Top 5</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {departmentTop5.map((dept) => (
              <div
                key={dept.name}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.05)' }}
              >
                <span className="font-medium text-sm">{dept.name}</span>
                <span
                  className={`font-mono font-bold ${dept.accent ? 'text-brand-main' : ''}`}
                >
                  {dept.cost}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Detail Billing Table                                        */}
      {/* ============================================================ */}
      <Card className="p-0 overflow-hidden">
        <div
          className="p-4 border-b font-bold flex justify-between items-center"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span>明细账单</span>
          <span className="text-xs text-secondary font-normal">共 128 条记录</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead
            className="border-b"
            style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.05)' }}
          >
            <tr>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">日期</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">调用 Key</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">模型</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">类型</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                Tokens / 次数
              </th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">
                费用
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {billingRows.map((row, i) => (
              <tr
                key={i}
                className="border-b hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <td className="p-4 text-secondary">{row.date}</td>
                <td className="p-4 font-mono text-brand-main">{row.key}</td>
                <td className="p-4">{row.model}</td>
                <td className="p-4">
                  <Badge variant="neutral">{row.type}</Badge>
                </td>
                <td className="p-4 font-mono">{row.usage}</td>
                <td className="p-4 text-right font-mono font-bold">{row.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
