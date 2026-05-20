import { useState } from 'react'
import { Plug, Plus, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface Channel {
  id: string
  name: string
  vendor: string
  vendorTag: string
  endpoint: string
  models: string[]
  priority: number
  latency: string
  latencyColor: 'green' | 'accent'
  status: 'enabled' | 'disabled'
}

const MOCK_CHANNELS: Channel[] = [
  {
    id: '1',
    name: 'Azure OpenAI',
    vendor: '微软',
    vendorTag: '微软',
    endpoint: 'https://hk-azure.openai.azure.com',
    models: ['gpt-4o', 'text-embedding-3'],
    priority: 1,
    latency: '24ms',
    latencyColor: 'green',
    status: 'enabled',
  },
  {
    id: '2',
    name: '智谱 AI 官方',
    vendor: 'Zhipu',
    vendorTag: 'Zhipu',
    endpoint: 'https://open.bigmodel.cn',
    models: ['glm-4', 'glm-4v'],
    priority: 2,
    latency: '158ms',
    latencyColor: 'accent',
    status: 'enabled',
  },
]

export default function Channels() {
  const [channels] = useState<Channel[]>(MOCK_CHANNELS)

  return (
    <div>
      <PageHeader
        title="模型渠道配置"
        subtitle="配置上游供应商 API 代理（如 OpenAI、Anthropic、智谱等）及高可用负载均衡。"
        breadcrumbs={[{ label: '网关接入' }, { label: '渠道管理' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />}>
            新增渠道
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead
            className="border-b"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
          >
            <tr>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                渠道名称 / 厂商
              </th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                支持模型
              </th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">
                优先级
              </th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">
                响应延迟
              </th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">
                状态
              </th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {channels.map((channel) => (
              <tr
                key={channel.id}
                className="border-b transition-colors hover:bg-elevated"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <td className="p-4">
                  <div className="font-bold flex items-center gap-2">
                    <Plug size={14} className="text-secondary" />
                    {channel.name}
                    <Badge variant="neutral" size="sm">{channel.vendorTag}</Badge>
                  </div>
                  <div className="text-xs text-secondary mt-1 font-mono">{channel.endpoint}</div>
                </td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap w-48">
                    {channel.models.map((model) => (
                      <Badge
                        key={model}
                        variant="neutral"
                        size="sm"
                        className="border border-[var(--border-color)]"
                      >
                        {model}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-center font-bold">{channel.priority}</td>
                <td className="p-4 text-center font-mono">
                  <span
                    style={{
                      color:
                        channel.latencyColor === 'green'
                          ? 'var(--brand-main)'
                          : 'var(--brand-accent)',
                    }}
                  >
                    {channel.latency}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <Badge variant={channel.status === 'enabled' ? 'success' : 'error'}>
                    {channel.status === 'enabled' ? '启用' : '停用'}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" icon={<Pencil size={14} />}>
                    编辑
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
