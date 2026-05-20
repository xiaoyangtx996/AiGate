import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { AlertTriangle, Clock, Bell, CheckCheck, Filter } from 'lucide-react'

interface AlertItem {
  id: string
  type: 'quota' | 'key' | 'mcp' | 'system'
  title: string
  description: string
  time: string
  read: boolean
}

const alertTabs = [
  { id: 'all', label: '全部' },
  { id: 'quota', label: '配额预警' },
  { id: 'key', label: '密钥预警' },
  { id: 'mcp', label: 'MCP 异常' },
  { id: 'system', label: '系统预警' },
]

const mockAlerts: AlertItem[] = [
  {
    id: '1',
    type: 'quota',
    title: '租户配额预警 (90% 水位)',
    description:
      '「北京研发中心」本月 Token 配额已消耗 92%，即将触及熔断限制，请提醒租户管理员关注超额审批。',
    time: '10 分钟前',
    read: false,
  },
  {
    id: '2',
    type: 'key',
    title: '员工密钥即将过期',
    description:
      '架构部员工「张三」的 DEV 测试密钥 (ag-dev-3a1b...) 距离过期仅剩 3 天，请通知其轮换密钥。',
    time: '2 小时前',
    read: false,
  },
  {
    id: '3',
    type: 'mcp',
    title: 'MCP 工具调用异常',
    description:
      'MCP 工具「code-review」近 1 小时内错误率达 15%，超过阈值 10%，请检查工具配置或上游服务状态。',
    time: '3 小时前',
    read: true,
  },
  {
    id: '4',
    type: 'quota',
    title: '部门配额预警 (70% 水位)',
    description:
      '「AI 研发部」本月 Token 配额已消耗 72%，建议关注使用趋势，提前规划下月配额分配。',
    time: '5 小时前',
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: '网关节点负载偏高',
    description:
      '网关节点 gateway-cn-north-1 近 30 分钟 CPU 使用率持续高于 85%，建议扩容或迁移部分流量。',
    time: '1 天前',
    read: true,
  },
]

function getAlertIcon(type: AlertItem['type']) {
  switch (type) {
    case 'quota':
      return <AlertTriangle size={20} />
    case 'key':
      return <Clock size={20} />
    case 'mcp':
      return <AlertTriangle size={20} />
    case 'system':
      return <Bell size={20} />
    default:
      return <AlertTriangle size={20} />
  }
}

function getAlertBadge(item: AlertItem) {
  if (!item.read) {
    return <Badge variant="warning">未读</Badge>
  }
  return null
}

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('all')
  const [alerts, setAlerts] = useState(mockAlerts)

  const filteredAlerts =
    activeTab === 'all' ? alerts : alerts.filter((a) => a.type === activeTab)

  const unreadCount = alerts.filter((a) => !a.read).length

  const tabItems = alertTabs.map((tab) => ({
    ...tab,
    count:
      tab.id === 'all'
        ? undefined
        : alerts.filter((a) => a.type === tab.id).length,
  }))

  function handleMarkAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
  }

  function handleMarkRead(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    )
  }

  return (
    <div>
      <PageHeader
        title="预警中心"
        subtitle="全局监控额度水位（70%/90%/100%）、密钥过期预警及 MCP 异常状态。"
        breadcrumbs={[{ label: '监控与合规' }, { label: '预警中心' }]}
        actions={
          <Button
            variant="secondary"
            icon={<CheckCheck size={16} />}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            全部标记已读
          </Button>
        }
      />

      <div className="mb-6">
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <Card className="p-0 overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <Filter size={40} className="mb-3 opacity-40" />
            <p className="text-sm">暂无此类预警</p>
          </div>
        ) : (
          <ul
            className="divide-y"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {filteredAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex gap-4 p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                style={{
                  backgroundColor: alert.read
                    ? undefined
                    : 'var(--bg-elevated)',
                }}
                onClick={() => handleMarkRead(alert.id)}
              >
                <div className="mt-1 text-brand-accent">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold truncate">
                      {alert.title}
                    </h4>
                    <div className="flex items-center gap-2 shrink-0">
                      {getAlertBadge(alert)}
                      <span className="text-xs text-secondary">
                        {alert.time}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-secondary line-clamp-2">
                    {alert.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
