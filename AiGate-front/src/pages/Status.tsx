import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Server, Zap } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface ServiceItem {
  name: string
  detail: string
  status: 'online' | 'warning' | 'offline'
  statusLabel: string
}

const infraServices: ServiceItem[] = [
  {
    name: 'AiGate API Gateway',
    detail: '响应时间: 12ms',
    status: 'online',
    statusLabel: '在线',
  },
  {
    name: 'Vector DB (Milvus)',
    detail: 'QPS: 120 / 延迟: 5ms',
    status: 'online',
    statusLabel: '在线',
  },
]

const channelServices: ServiceItem[] = [
  {
    name: 'OpenAI API Channel',
    detail: '可用率: 99.98%',
    status: 'online',
    statusLabel: '正常',
  },
  {
    name: 'Anthropic API Channel',
    detail: '可用率: 100.00%',
    status: 'online',
    statusLabel: '正常',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getBadgeVariant(status: ServiceItem['status']) {
  switch (status) {
    case 'online':
      return 'success' as const
    case 'warning':
      return 'warning' as const
    case 'offline':
      return 'error' as const
  }
}

function getSectionHealthRate(items: ServiceItem[]) {
  const online = items.filter((s) => s.status === 'online').length
  return Math.round((online / items.length) * 100)
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ServiceStatusCard({
  title,
  icon,
  services,
}: {
  title: string
  icon: React.ReactNode
  services: ServiceItem[]
}) {
  const healthRate = getSectionHealthRate(services)

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <Badge variant="success">健康率 {healthRate}%</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex justify-between items-center pb-4 border-b last:border-b-0 last:pb-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <div className="font-bold text-sm">{service.name}</div>
                <div className="text-xs text-secondary mt-0.5">
                  {service.detail}
                </div>
              </div>
              <Badge variant={getBadgeVariant(service.status)}>
                {service.statusLabel}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Status() {
  return (
    <div>
      <PageHeader
        title="系统状态页"
        subtitle="实时监控 AiGate 网关接入点、向量数据库以及底层大模型渠道的在线状态。"
        breadcrumbs={[{ label: '监控合规' }, { label: '系统状态' }]}
        actions={
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-main opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-main" />
            </span>
            <span className="text-sm font-bold text-brand-main">
              所有系统运行正常
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ServiceStatusCard
          title="核心基础设施"
          icon={<Server size={18} className="text-brand-main" />}
          services={infraServices}
        />

        <ServiceStatusCard
          title="大模型上游渠道"
          icon={<Zap size={18} className="text-brand-main" />}
          services={channelServices}
        />
      </div>
    </div>
  )
}
