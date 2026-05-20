import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Boxes,
  Radio,
  AlertTriangle,
  DollarSign,
  Plus,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const kpiCards = [
  {
    label: '活跃模型',
    value: '24',
    icon: Boxes,
    color: 'text-brand-main',
  },
  {
    label: '渠道来源',
    value: '6',
    icon: Radio,
    color: '',
  },
  {
    label: '低余量预警',
    value: '3',
    icon: AlertTriangle,
    color: 'text-brand-accent',
  },
  {
    label: '本月消耗',
    value: '¥12,450',
    icon: DollarSign,
    color: '',
  },
]

interface ModelRow {
  name: string
  vendor: string
  type: 'Chat' | 'Image' | 'Video' | 'Embedding'
  channel: string
  remaining: string
  usedPercent: number
  status: 'normal' | 'low' | 'exhausted'
  todayCalls: string
}

const modelData: ModelRow[] = [
  {
    name: 'gpt-4o',
    vendor: 'OpenAI',
    type: 'Chat',
    channel: 'OpenAI Official',
    remaining: '$180.00',
    usedPercent: 36,
    status: 'normal',
    todayCalls: '8,432',
  },
  {
    name: 'claude-3-5-sonnet',
    vendor: 'Anthropic',
    type: 'Chat',
    channel: 'Anthropic Claude',
    remaining: '$12.40',
    usedPercent: 92,
    status: 'low',
    todayCalls: '3,218',
  },
  {
    name: 'dall-e-3',
    vendor: 'OpenAI',
    type: 'Image',
    channel: 'OpenAI Official',
    remaining: '$45.00',
    usedPercent: 45,
    status: 'normal',
    todayCalls: '124',
  },
  {
    name: 'sora-turbo',
    vendor: 'OpenAI',
    type: 'Video',
    channel: 'OpenAI Official',
    remaining: '$320.00',
    usedPercent: 20,
    status: 'normal',
    todayCalls: '18',
  },
  {
    name: 'text-embedding-3-large',
    vendor: 'OpenAI',
    type: 'Embedding',
    channel: 'OpenAI Official',
    remaining: '$88.00',
    usedPercent: 44,
    status: 'normal',
    todayCalls: '45,210',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: ModelRow['status']) {
  switch (status) {
    case 'normal':
      return <Badge variant="success">正常</Badge>
    case 'low':
      return <Badge variant="warning">低余量</Badge>
    case 'exhausted':
      return <Badge variant="error">耗尽</Badge>
  }
}

function typeBadge(type: ModelRow['type']) {
  return (
    <span className="badge" style={{ borderColor: 'var(--border-color)' }}>
      {type}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Models() {
  const [channelFilter, setChannelFilter] = useState('全部渠道')
  const [typeFilter, setTypeFilter] = useState('全部类型')
  const [statusFilter, setStatusFilter] = useState('全部')

  const filteredData = modelData.filter((row) => {
    if (channelFilter !== '全部渠道' && row.channel !== channelFilter) return false
    if (typeFilter !== '全部类型' && row.type !== typeFilter) return false
    if (statusFilter === '正常' && row.status !== 'normal') return false
    if (statusFilter === '低余量' && row.status !== 'low') return false
    if (statusFilter === '耗尽' && row.status !== 'exhausted') return false
    return true
  })

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="模型资产管理"
        subtitle="管理所有渠道下的可用模型，监控各模型剩余额度与调用健康状态。"
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

      {/* Filters */}
      <Card
        className="mb-6 flex flex-wrap gap-4 items-end p-4"
        style={{
          background: 'rgba(0,0,0,0.05)',
        }}
      >
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            渠道筛选
          </label>
          <select
            className="input-base w-full"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option>全部渠道</option>
            <option>OpenAI Official</option>
            <option>Anthropic Claude</option>
            <option>Google Gemini</option>
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            类型
          </label>
          <select
            className="input-base w-full"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>全部类型</option>
            <option>Chat</option>
            <option>Image</option>
            <option>Video</option>
            <option>Embedding</option>
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            健康状态
          </label>
          <select
            className="input-base w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>全部</option>
            <option>正常</option>
            <option>低余量</option>
            <option>耗尽</option>
          </select>
        </div>
      </Card>

      {/* Models Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead
              className="border-b"
              style={{
                borderColor: 'var(--border-color)',
                background: 'rgba(0,0,0,0.05)',
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
                  渠道
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
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
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
              {filteredData.map((row) => {
                const isLow = row.status === 'low'
                const barColor = isLow ? 'var(--brand-accent)' : 'var(--brand-main)'
                const remainingPercent = 100 - row.usedPercent

                return (
                  <tr
                    key={row.name}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <td className="p-4">
                      <div className="font-bold">{row.name}</div>
                      <div className="text-xs text-secondary font-mono mt-0.5">
                        {row.vendor}
                      </div>
                    </td>
                    <td className="p-4">{typeBadge(row.type)}</td>
                    <td className="p-4 text-secondary">{row.channel}</td>
                    <td
                      className={`p-4 font-mono font-bold ${isLow ? 'text-brand-accent' : ''}`}
                    >
                      {row.remaining}
                    </td>
                    <td className="p-4 w-40">
                      <div
                        className="w-full h-2 rounded-full"
                        style={{ background: 'var(--border-color)' }}
                      >
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${remainingPercent}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <div
                        className={`text-xs mt-1 ${isLow ? 'text-brand-accent' : 'text-secondary'}`}
                      >
                        已用 {row.usedPercent}% · 余 {remainingPercent}%
                      </div>
                    </td>
                    <td className="p-4 font-mono">{row.todayCalls}</td>
                    <td className="p-4">{statusBadge(row.status)}</td>
                    <td className="p-4 text-right">
                      <button className="text-brand-main font-bold text-xs hover:underline">
                        详情
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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
    </div>
  )
}
