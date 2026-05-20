import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Timeline, type TimelineStatus } from '@/components/ui/Timeline'
import {
  Server,
  Zap,
  Plug,
  Database,
  RefreshCw,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ServiceItem {
  name: string
  detail: string
  status: 'online' | 'warning' | 'offline'
  statusLabel: string
  uptime?: string
}

interface MetricItem {
  label: string
  icon: React.ReactNode
  value: number
  unit: string
  color: string
  detail: string
}

interface IncidentItem {
  id: string
  title: string
  description: string
  time: string
  status: TimelineStatus
  details?: React.ReactNode
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const infraServices: ServiceItem[] = [
  {
    name: 'AiGate API Gateway',
    detail: '响应时间: 12ms | QPS: 2,450',
    status: 'online',
    statusLabel: '在线',
    uptime: '99.99%',
  },
  {
    name: 'Vector DB (Milvus)',
    detail: 'QPS: 120 | 延迟: 5ms | 索引: 1.2M 向量',
    status: 'online',
    statusLabel: '在线',
    uptime: '99.97%',
  },
  {
    name: 'PostgreSQL (主库)',
    detail: '连接数: 45/200 | 延迟: 2ms',
    status: 'online',
    statusLabel: '在线',
    uptime: '99.99%',
  },
  {
    name: 'Redis Cache',
    detail: '命中率: 98.5% | 内存: 2.1/8 GB',
    status: 'online',
    statusLabel: '在线',
    uptime: '100%',
  },
]

const channelServices: ServiceItem[] = [
  {
    name: 'OpenAI API',
    detail: '可用率: 99.98% | 延迟: 320ms',
    status: 'online',
    statusLabel: '正常',
    uptime: '99.98%',
  },
  {
    name: 'Anthropic API',
    detail: '可用率: 100% | 延迟: 280ms',
    status: 'online',
    statusLabel: '正常',
    uptime: '100%',
  },
  {
    name: 'DeepSeek API',
    detail: '可用率: 99.85% | 延迟: 450ms',
    status: 'warning',
    statusLabel: '延迟升高',
    uptime: '99.85%',
  },
  {
    name: 'Azure OpenAI',
    detail: '可用率: 99.99% | 延迟: 180ms',
    status: 'online',
    statusLabel: '正常',
    uptime: '99.99%',
  },
]

const mcpServices: ServiceItem[] = [
  {
    name: 'MCP Gateway',
    detail: '已注册工具: 32 | 在线: 30',
    status: 'online',
    statusLabel: '在线',
    uptime: '99.95%',
  },
  {
    name: 'Web Search Tool',
    detail: '调用量: 1.2K/h | 延迟: 850ms',
    status: 'online',
    statusLabel: '正常',
    uptime: '99.90%',
  },
  {
    name: 'File System Tool',
    detail: '调用量: 340/h | 延迟: 45ms',
    status: 'online',
    statusLabel: '正常',
    uptime: '100%',
  },
  {
    name: 'Database Query Tool',
    detail: '调用量: 890/h | 延迟: 120ms',
    status: 'offline',
    statusLabel: '离线',
    uptime: '95.20%',
  },
]

const systemMetrics: MetricItem[] = [
  {
    label: 'CPU 使用率',
    icon: <Cpu size={16} />,
    value: 34,
    unit: '%',
    color: 'var(--brand-main)',
    detail: '8 核 | 平均负载 2.7',
  },
  {
    label: '内存使用率',
    icon: <MemoryStick size={16} />,
    value: 62,
    unit: '%',
    color: 'var(--brand-accent)',
    detail: '已用 9.9 / 16 GB',
  },
  {
    label: '磁盘使用率',
    icon: <HardDrive size={16} />,
    value: 45,
    unit: '%',
    color: 'var(--info)',
    detail: '已用 180 / 400 GB',
  },
  {
    label: '网络带宽',
    icon: <Network size={16} />,
    value: 28,
    unit: '%',
    color: 'var(--success)',
    detail: '入站 120 Mbps / 出站 85 Mbps',
  },
]

const incidentHistory: IncidentItem[] = [
  {
    id: 'inc-001',
    title: 'DeepSeek API 延迟升高',
    description: 'DeepSeek 上游响应延迟从 200ms 升至 450ms，影响部分推理请求。',
    time: '2026-05-20 09:30',
    status: 'active',
    details: (
      <div className="space-y-1 text-xs">
        <p>影响范围：使用 DeepSeek 模型的所有调用</p>
        <p>根因：DeepSeek 上游基础设施扩容中</p>
        <p>处理措施：已自动切换至备用节点，监控中</p>
      </div>
    ),
  },
  {
    id: 'inc-002',
    title: 'Database Query Tool 离线',
    description: 'MCP Database Query Tool 心跳超时，服务不可用。',
    time: '2026-05-20 08:15',
    status: 'error',
    details: (
      <div className="space-y-1 text-xs">
        <p>影响范围：所有依赖数据库查询工具的 Agent</p>
        <p>根因：数据库连接池耗尽</p>
        <p>处理措施：正在重启服务，预计 10 分钟恢复</p>
      </div>
    ),
  },
  {
    id: 'inc-003',
    title: '网关限流触发',
    description: 'API Gateway 触发限流保护，部分请求返回 429。',
    time: '2026-05-19 22:00',
    status: 'success',
    details: (
      <div className="space-y-1 text-xs">
        <p>影响范围：高峰时段批量调用</p>
        <p>根因：某部门批量任务超出配额</p>
        <p>处理措施：已扩容至 5,000 QPS，限流阈值已调整</p>
      </div>
    ),
  },
  {
    id: 'inc-004',
    title: '向量库索引重建',
    description: 'Milvus 执行定时索引优化，期间查询延迟略有上升。',
    time: '2026-05-19 03:00',
    status: 'success',
    details: (
      <div className="space-y-1 text-xs">
        <p>影响范围：RAG 检索请求</p>
        <p>根因：计划内维护</p>
        <p>处理措施：已于 03:25 完成，延迟恢复正常</p>
      </div>
    ),
  },
  {
    id: 'inc-005',
    title: '全平台运行正常',
    description: '过去 7 天无重大故障，所有服务保持 99.9%+ 可用率。',
    time: '2026-05-18 00:00',
    status: 'success',
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

function getOverallStatus(services: ServiceItem[][]): {
  label: string
  color: string
  icon: React.ReactNode
} {
  const all = services.flat()
  const hasOffline = all.some((s) => s.status === 'offline')
  const hasWarning = all.some((s) => s.status === 'warning')

  if (hasOffline) {
    return {
      label: '部分服务异常',
      color: 'var(--error)',
      icon: <XCircle size={16} />,
    }
  }
  if (hasWarning) {
    return {
      label: '部分服务降级',
      color: 'var(--warning)',
      icon: <AlertTriangle size={16} />,
    }
  }
  return {
    label: '所有系统运行正常',
    color: 'var(--success)',
    icon: <CheckCircle size={16} />,
  }
}

function formatLastRefresh(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
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
        <Badge variant={healthRate === 100 ? 'success' : healthRate >= 80 ? 'warning' : 'error'}>
          健康率 {healthRate}%
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex justify-between items-center pb-4 border-b last:border-b-0 last:pb-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{service.name}</span>
                  {service.uptime && (
                    <span className="text-xs text-secondary">SLA {service.uptime}</span>
                  )}
                </div>
                <div className="text-xs text-secondary mt-0.5 truncate">
                  {service.detail}
                </div>
              </div>
              <Badge variant={getBadgeVariant(service.status)} className="ml-3 flex-shrink-0">
                {service.statusLabel}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MetricBar({ metric }: { metric: MetricItem }) {
  const barColor =
    metric.value > 80
      ? 'var(--error)'
      : metric.value > 60
        ? 'var(--warning)'
        : metric.color

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span style={{ color: 'var(--text-secondary)' }}>{metric.icon}</span>
          {metric.label}
        </div>
        <span className="text-sm font-bold" style={{ color: barColor }}>
          {metric.value}{metric.unit}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${metric.value}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <div className="text-xs text-secondary">{metric.detail}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Status() {
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [countdown, setCountdown] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  const allServices = [infraServices, channelServices, mcpServices]
  const overall = getOverallStatus(allServices)

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setLastRefresh(new Date())
      setCountdown(30)
      setRefreshing(false)
    }, 600)
  }, [])

  // Auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRefresh()
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [handleRefresh])

  return (
    <div>
      <PageHeader
        title="系统状态"
        subtitle="实时监控 AiGate 网关、向量数据库、大模型渠道及 MCP 工具的健康状态。"
        breadcrumbs={[{ label: '监控合规' }, { label: '系统状态' }]}
        actions={
          <div className="flex items-center gap-4">
            {/* Overall status indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: overall.color }}
                />
                <span
                  className="relative inline-flex rounded-full h-3 w-3"
                  style={{ backgroundColor: overall.color }}
                />
              </span>
              <span className="text-sm font-bold" style={{ color: overall.color }}>
                {overall.label}
              </span>
            </div>

            {/* Refresh control */}
            <div className="flex items-center gap-2 text-xs text-secondary">
              <Clock size={14} />
              <span>上次刷新: {formatLastRefresh(lastRefresh)}</span>
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                {countdown}s
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-md transition-colors hover:bg-elevated"
                style={{ color: 'var(--text-secondary)' }}
                title="立即刷新"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>
        }
      />

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
        <ServiceStatusCard
          title="MCP 工具服务"
          icon={<Plug size={18} className="text-brand-main" />}
          services={mcpServices}
        />
      </div>

      {/* System Metrics + Incident History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Metrics */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database size={18} className="text-brand-main" />
              系统资源指标
            </CardTitle>
            <span className="text-xs text-secondary">实时采集</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {systemMetrics.map((metric) => (
                <MetricBar key={metric.label} metric={metric} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Incident History Timeline */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock size={18} className="text-brand-main" />
              历史故障时间线
            </CardTitle>
            <span className="text-xs text-secondary">近 7 天</span>
          </CardHeader>
          <CardContent>
            <Timeline items={incidentHistory} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
