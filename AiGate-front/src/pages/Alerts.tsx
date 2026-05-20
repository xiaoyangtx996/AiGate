import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Drawer } from '@/components/ui/Drawer'
import { Timeline } from '@/components/ui/Timeline'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Clock,
  Bell,
  CheckCheck,
  Filter,
  Key,
  Puzzle,
  BookOpen,
  Bot,
  Receipt,
  Gauge,
  ShieldAlert,
  XCircle,
  CheckCircle,
  Eye,
  Wrench,
  ChevronRight,
  Activity,
  Info,
  CircleDot,
  SkipForward,
} from 'lucide-react'

// --- 类型定义 ---

type AlertSeverity = 'critical' | 'warning' | 'info'
type AlertCategory = 'quota' | 'key' | 'anomaly' | 'mcp' | 'knowledge' | 'agent' | 'subscription'
type AlertStatus = 'pending' | 'processing' | 'resolved'

interface AlertItem {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  status: AlertStatus
  title: string
  description: string
  triggerTarget: string
  triggerTime: string
  duration: string
  recommendation: string[]
  timeline: {
    id: string
    title: string
    description: string
    time: string
    status: 'success' | 'active' | 'error' | 'pending'
  }[]
}

// --- 常量 ---

const categoryTabs: { id: string; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: '全部' },
  { id: 'quota', label: '配额', icon: <Gauge size={14} /> },
  { id: 'key', label: '密钥', icon: <Key size={14} /> },
  { id: 'anomaly', label: '异常调用', icon: <ShieldAlert size={14} /> },
  { id: 'mcp', label: 'MCP', icon: <Puzzle size={14} /> },
  { id: 'knowledge', label: '知识库', icon: <BookOpen size={14} /> },
  { id: 'agent', label: 'Agent', icon: <Bot size={14} /> },
  { id: 'subscription', label: '套餐', icon: <Receipt size={14} /> },
]

const severityOptions: { id: string; label: string; color: string }[] = [
  { id: 'all', label: '全部', color: '' },
  { id: 'critical', label: '紧急', color: 'var(--error)' },
  { id: 'warning', label: '警告', color: 'var(--warning)' },
  { id: 'info', label: '提示', color: 'var(--info)' },
]

const statusOptions: { id: string; label: string }[] = [
  { id: 'all', label: '全部状态' },
  { id: 'pending', label: '未处理' },
  { id: 'processing', label: '处理中' },
  { id: 'resolved', label: '已解决' },
]

// --- Mock 数据 ---

const mockAlerts: AlertItem[] = [
  {
    id: '1',
    category: 'quota',
    severity: 'critical',
    status: 'pending',
    title: '租户配额已达 92%',
    description:
      '「北京研发中心」本月 Token 配额已消耗 92%，即将触及熔断限制。当前日均消耗 120 万 Token，预计 3 天后耗尽。',
    triggerTarget: '北京研发中心',
    triggerTime: '2026-05-20 09:15',
    duration: '已持续 2 小时',
    recommendation: ['扩容申请', '限制高成本模型'],
    timeline: [
      {
        id: 't1',
        title: '配额水位达到 90%',
        description: '系统自动触发预警通知',
        time: '2026-05-20 08:30',
        status: 'error',
      },
      {
        id: 't2',
        title: '通知已发送',
        description: '邮件 + 系统通知已推送至租户管理员 admin@bjrd.com',
        time: '2026-05-20 08:31',
        status: 'success',
      },
      {
        id: 't3',
        title: '等待处置',
        description: '暂无操作反馈',
        time: '2026-05-20 09:15',
        status: 'active',
      },
    ],
  },
  {
    id: '2',
    category: 'key',
    severity: 'warning',
    status: 'pending',
    title: '员工密钥即将过期 (3 天)',
    description:
      '架构部员工「张三」的 DEV 测试密钥 (ag-dev-3a1b...) 距离过期仅剩 3 天，当前日均调用量 850 次。',
    triggerTarget: '张三 · ag-dev-3a1b...',
    triggerTime: '2026-05-20 07:00',
    duration: '已持续 4 小时',
    recommendation: ['通知员工续期', '一键续期'],
    timeline: [
      {
        id: 't1',
        title: '密钥到期预警触发',
        description: '检测到密钥剩余有效期 < 7 天',
        time: '2026-05-20 07:00',
        status: 'error',
      },
      {
        id: 't2',
        title: '通知已发送',
        description: '系统通知已推送至张三',
        time: '2026-05-20 07:01',
        status: 'success',
      },
    ],
  },
  {
    id: '3',
    category: 'anomaly',
    severity: 'critical',
    status: 'processing',
    title: '异常调用频率 5x',
    description:
      '用户「李四」近 30 分钟内 API 调用频率突增至正常水平的 5 倍，疑似自动化脚本滥用。IP: 192.168.1.105',
    triggerTarget: '李四 · 192.168.1.105',
    triggerTime: '2026-05-20 06:30',
    duration: '已持续 5 小时',
    recommendation: ['限速', '封禁', '忽略'],
    timeline: [
      {
        id: 't1',
        title: '异常调用检测',
        description: '调用频率超过阈值 5 倍',
        time: '2026-05-20 06:30',
        status: 'error',
      },
      {
        id: 't2',
        title: '自动限速已启用',
        description: '对该用户临时限速至 10 次/分钟',
        time: '2026-05-20 06:31',
        status: 'success',
      },
      {
        id: 't3',
        title: '管理员介入处理中',
        description: '分公司管理员正在核实情况',
        time: '2026-05-20 07:15',
        status: 'active',
      },
    ],
  },
  {
    id: '4',
    category: 'mcp',
    severity: 'warning',
    status: 'pending',
    title: 'MCP 工具调用异常 (错误率 15%)',
    description:
      'MCP 工具「code-review」近 1 小时内错误率达 15%，超过阈值 10%。上游服务返回 503 比例偏高。',
    triggerTarget: 'code-review',
    triggerTime: '2026-05-20 05:00',
    duration: '已持续 6 小时',
    recommendation: ['检查服务', '临时停用'],
    timeline: [
      {
        id: 't1',
        title: '错误率超阈值',
        description: '错误率 15% > 阈值 10%',
        time: '2026-05-20 05:00',
        status: 'error',
      },
      {
        id: 't2',
        title: '健康状态降级',
        description: 'MCP 工具状态已标记为「降级」',
        time: '2026-05-20 05:01',
        status: 'warning' as 'active',
      },
    ],
  },
  {
    id: '5',
    category: 'knowledge',
    severity: 'info',
    status: 'resolved',
    title: '知识库存储达到 80%',
    description: '「AI 研发部」知识库存储空间已使用 80%，建议清理过期文档或申请扩容。',
    triggerTarget: 'AI 研发部',
    triggerTime: '2026-05-19 14:00',
    duration: '已持续 21 小时',
    recommendation: ['清理过期文档', '申请扩容'],
    timeline: [
      {
        id: 't1',
        title: '存储预警触发',
        description: '存储使用率达到 80%',
        time: '2026-05-19 14:00',
        status: 'error',
      },
      {
        id: 't2',
        title: '管理员已处理',
        description: '清理了 2.3GB 过期文档，当前使用率降至 65%',
        time: '2026-05-19 16:30',
        status: 'success',
      },
    ],
  },
  {
    id: '6',
    category: 'agent',
    severity: 'warning',
    status: 'pending',
    title: 'Agent 调用异常 (连续失败 5 次)',
    description: '项目 Agent「代码助手」连续 5 次调用失败，可能是知识库索引异常或 MCP 工具不可用。',
    triggerTarget: '代码助手 · AI 研发部',
    triggerTime: '2026-05-20 10:00',
    duration: '已持续 1 小时',
    recommendation: ['核实配置', '临时停用'],
    timeline: [
      {
        id: 't1',
        title: '连续失败检测',
        description: '最近 5 次调用全部返回错误',
        time: '2026-05-20 10:00',
        status: 'error',
      },
      {
        id: 't2',
        title: '预警通知已发送',
        description: '通知已推送至项目负责人',
        time: '2026-05-20 10:01',
        status: 'success',
      },
    ],
  },
  {
    id: '7',
    category: 'subscription',
    severity: 'warning',
    status: 'pending',
    title: '套餐将在 7 天后到期',
    description: '当前「企业标准版」套餐将于 2026-05-27 到期，届时将降级为免费版，功能受限。',
    triggerTarget: '企业标准版',
    triggerTime: '2026-05-20 00:00',
    duration: '已持续 12 小时',
    recommendation: ['续费', '接受降级'],
    timeline: [
      {
        id: 't1',
        title: '套餐到期预警',
        description: '距到期还有 7 天',
        time: '2026-05-20 00:00',
        status: 'error',
      },
    ],
  },
  {
    id: '8',
    category: 'quota',
    severity: 'warning',
    status: 'resolved',
    title: '部门配额已达 72%',
    description: '「AI 研发部」本月 Token 配额已消耗 72%，建议关注使用趋势，提前规划下月配额分配。',
    triggerTarget: 'AI 研发部',
    triggerTime: '2026-05-19 09:00',
    duration: '已持续 27 小时',
    recommendation: ['关注趋势', '规划配额'],
    timeline: [
      {
        id: 't1',
        title: '配额水位达到 70%',
        description: '系统自动触发预警',
        time: '2026-05-19 09:00',
        status: 'error',
      },
      {
        id: 't2',
        title: '已确认',
        description: '管理员已确认，下月将增加配额',
        time: '2026-05-19 10:20',
        status: 'success',
      },
    ],
  },
  {
    id: '9',
    category: 'anomaly',
    severity: 'info',
    status: 'resolved',
    title: '调用频率异常波动',
    description: '销售部 API 调用频率在 14:00-15:00 出现异常波动，经排查为批量数据导出导致，非安全事件。',
    triggerTarget: '销售部',
    triggerTime: '2026-05-18 14:00',
    duration: '已解决',
    recommendation: ['忽略'],
    timeline: [
      {
        id: 't1',
        title: '频率波动检测',
        description: '调用频率偏离基线 3 倍',
        time: '2026-05-18 14:00',
        status: 'error',
      },
      {
        id: 't2',
        title: '原因确认',
        description: '批量数据导出操作，非异常',
        time: '2026-05-18 15:30',
        status: 'success',
      },
      {
        id: 't3',
        title: '已标记忽略',
        description: '管理员标记为正常行为',
        time: '2026-05-18 15:35',
        status: 'success',
      },
    ],
  },
]

// --- 辅助函数 ---

function getCategoryLabel(category: AlertCategory): string {
  const map: Record<AlertCategory, string> = {
    quota: '配额',
    key: '密钥',
    anomaly: '异常调用',
    mcp: 'MCP',
    knowledge: '知识库',
    agent: 'Agent',
    subscription: '套餐',
  }
  return map[category]
}

function getCategoryIcon(category: AlertCategory) {
  const map: Record<AlertCategory, React.ReactNode> = {
    quota: <Gauge size={16} />,
    key: <Key size={16} />,
    anomaly: <ShieldAlert size={16} />,
    mcp: <Puzzle size={16} />,
    knowledge: <BookOpen size={16} />,
    agent: <Bot size={16} />,
    subscription: <Receipt size={16} />,
  }
  return map[category]
}

function getSeverityColor(severity: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    critical: 'var(--error)',
    warning: 'var(--warning)',
    info: 'var(--info)',
  }
  return map[severity]
}

function getSeverityLabel(severity: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    critical: '紧急',
    warning: '警告',
    info: '提示',
  }
  return map[severity]
}

function getStatusLabel(status: AlertStatus): string {
  const map: Record<AlertStatus, string> = {
    pending: '未处理',
    processing: '处理中',
    resolved: '已解决',
  }
  return map[status]
}

function getStatusBadgeVariant(status: AlertStatus): 'error' | 'warning' | 'success' {
  const map: Record<AlertStatus, 'error' | 'warning' | 'success'> = {
    pending: 'error',
    processing: 'warning',
    resolved: 'success',
  }
  return map[status]
}

// --- 主组件 ---

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('all')
  const [activeSeverity, setActiveSeverity] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  const [alerts, setAlerts] = useState(mockAlerts)
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ type: string; alertId?: string } | null>(null)

  // 筛选逻辑
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (activeTab !== 'all' && a.category !== activeTab) return false
      if (activeSeverity !== 'all' && a.severity !== activeSeverity) return false
      if (activeStatus !== 'all' && a.status !== activeStatus) return false
      return true
    })
  }, [alerts, activeTab, activeSeverity, activeStatus])

  // 统计
  const stats = useMemo(() => {
    return {
      pending: alerts.filter((a) => a.status === 'pending').length,
      processing: alerts.filter((a) => a.status === 'processing').length,
      resolvedWeek: alerts.filter((a) => a.status === 'resolved').length,
    }
  }, [alerts])

  // Tab 计数
  const tabItems = categoryTabs.map((tab) => ({
    ...tab,
    count:
      tab.id === 'all'
        ? undefined
        : alerts.filter((a) => a.category === tab.id).length,
  }))

  // 操作处理
  function handleMarkAllRead() {
    setConfirmAction({ type: 'markAllResolved' })
  }

  function handleConfirmAction() {
    if (!confirmAction) return
    if (confirmAction.type === 'markAllResolved') {
      setAlerts((prev) => prev.map((a) => ({ ...a, status: 'resolved' as AlertStatus })))
    } else if (confirmAction.type === 'markResolved' && confirmAction.alertId) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === confirmAction.alertId ? { ...a, status: 'resolved' as AlertStatus } : a))
      )
      handleCloseDrawer()
    }
    setConfirmAction(null)
  }

  function handleOpenDrawer(alert: AlertItem) {
    setSelectedAlert(alert)
    setDrawerOpen(true)
    setActionNote('')
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    setSelectedAlert(null)
    setActionNote('')
  }

  function handleAction(alertId: string, newStatus: AlertStatus) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    )
    handleCloseDrawer()
  }

  return (
    <div>
      <PageHeader
        title="预警中心"
        subtitle="全局监控配额水位、密钥生命周期、异常调用及各类服务健康状态。"
        breadcrumbs={[{ label: '监控与合规' }, { label: '预警中心' }]}
        actions={
          <Button
            variant="secondary"
            icon={<CheckCheck size={16} />}
            onClick={handleMarkAllRead}
            disabled={stats.pending === 0 && stats.processing === 0}
          >
            全部标记已解决
          </Button>
        }
      />

      {/* 顶部 KPI */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="flex items-center gap-4 p-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--error) 12%, transparent)' }}
          >
            <XCircle size={20} style={{ color: 'var(--error)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--error)' }}>
              {stats.pending}
            </p>
            <p className="text-xs text-secondary">未处理</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)' }}
          >
            <Clock size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
              {stats.processing}
            </p>
            <p className="text-xs text-secondary">处理中</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--brand-main)20' }}
          >
            <CheckCircle size={20} style={{ color: 'var(--brand-main)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--brand-main)' }}>
              {stats.resolvedWeek}
            </p>
            <p className="text-xs text-secondary">本周已解决</p>
          </div>
        </Card>
      </div>

      {/* 分类 Tab */}
      <div className="mb-4">
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* 筛选栏 */}
      <div
        className="flex items-center gap-6 mb-4 px-4 py-3 rounded-lg"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        {/* 严重程度 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary shrink-0">严重程度</span>
          <div className="flex gap-1">
            {severityOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveSeverity(opt.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all"
                style={{
                  backgroundColor:
                    activeSeverity === opt.id
                      ? 'var(--bg-surface)'
                      : 'transparent',
                  color:
                    activeSeverity === opt.id
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  boxShadow:
                    activeSeverity === opt.id
                      ? '0 1px 2px rgba(0,0,0,0.1)'
                      : 'none',
                }}
              >
                {opt.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="w-px h-4"
          style={{ backgroundColor: 'var(--border-color)' }}
        />

        {/* 处理状态 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary shrink-0">处理状态</span>
          <div className="flex gap-1">
            {statusOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveStatus(opt.id)}
                className="px-2.5 py-1 text-xs rounded-md transition-all"
                style={{
                  backgroundColor:
                    activeStatus === opt.id
                      ? 'var(--bg-surface)'
                      : 'transparent',
                  color:
                    activeStatus === opt.id
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  boxShadow:
                    activeStatus === opt.id
                      ? '0 1px 2px rgba(0,0,0,0.1)'
                      : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-secondary">
          <Filter size={14} />
          <span>共 {filteredAlerts.length} 条预警</span>
        </div>
      </div>

      {/* 预警列表 */}
      <Card className="p-0 overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <Bell size={40} className="mb-3 opacity-40" />
            <p className="text-sm">暂无匹配的预警</p>
            <p className="text-xs mt-1 opacity-60">尝试调整筛选条件</p>
          </div>
        ) : (
          <ul
            className="divide-y"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {filteredAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex gap-0 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                onClick={() => handleOpenDrawer(alert)}
              >
                {/* 严重程度色条 */}
                <div
                  className="w-1 shrink-0"
                  style={{ backgroundColor: getSeverityColor(alert.severity) }}
                />

                <div className="flex-1 flex gap-4 p-4 min-w-0">
                  {/* 类型图标 */}
                  <div
                    className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: getSeverityColor(alert.severity) + '15',
                      color: getSeverityColor(alert.severity),
                    }}
                  >
                    {getCategoryIcon(alert.category)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant={getStatusBadgeVariant(alert.status)}
                          size="sm"
                        >
                          {getStatusLabel(alert.status)}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          {getCategoryLabel(alert.category)}
                        </Badge>
                        <h4 className="text-sm font-bold truncate">
                          {alert.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-secondary">
                          {alert.duration}
                        </span>
                        <ChevronRight size={14} className="text-secondary" />
                      </div>
                    </div>

                    <p className="mt-1 text-sm text-secondary line-clamp-1">
                      {alert.description}
                    </p>

                    <div className="mt-2 flex items-center gap-4 text-xs text-secondary">
                      <span className="flex items-center gap-1">
                        <CircleDot size={12} />
                        {alert.triggerTarget}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {alert.triggerTime}
                      </span>
                    </div>

                    {/* 推荐处置 */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-secondary">推荐处置：</span>
                      {alert.recommendation.map((rec, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'markAllResolved' ? '确认全部标记已解决' : '确认标记已解决'}
        description={confirmAction?.type === 'markAllResolved' ? '将所有未处理和处理中的预警标记为已解决，此操作不可撤销。' : '确认将此预警标记为已解决？'}
        confirmText="确认"
        variant="warning"
      />

      {/* 处置抽屉 */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title="预警详情"
        description={selectedAlert?.title}
        width="md"
      >
        {selectedAlert && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div
              className="p-4 rounded-lg space-y-3"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-1 h-8 rounded-full"
                  style={{
                    backgroundColor: getSeverityColor(selectedAlert.severity),
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getStatusBadgeVariant(selectedAlert.status)}
                    >
                      {getStatusLabel(selectedAlert.status)}
                    </Badge>
                    <Badge variant="neutral">
                      {getCategoryLabel(selectedAlert.category)}
                    </Badge>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          getSeverityColor(selectedAlert.severity) + '20',
                        color: getSeverityColor(selectedAlert.severity),
                      }}
                    >
                      {getSeverityLabel(selectedAlert.severity)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold mt-2">
                    {selectedAlert.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-secondary">
                {selectedAlert.description}
              </p>

              <div
                className="flex items-center gap-6 pt-2 text-xs text-secondary"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                <span className="flex items-center gap-1">
                  <CircleDot size={12} />
                  触发对象：{selectedAlert.triggerTarget}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  触发时间：{selectedAlert.triggerTime}
                </span>
                <span className="flex items-center gap-1">
                  <Activity size={12} />
                  {selectedAlert.duration}
                </span>
              </div>
            </div>

            {/* 系统建议 */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Info size={14} />
                系统建议处置
              </h4>
              <div className="flex gap-2 flex-wrap">
                {selectedAlert.recommendation.map((rec, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 text-sm rounded-lg"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {rec}
                  </span>
                ))}
              </div>
            </div>

            {/* 事件链路时间线 */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock size={14} />
                事件链路
              </h4>
              <Timeline items={selectedAlert.timeline} />
            </div>

            {/* 处置操作 */}
            {selectedAlert.status !== 'resolved' && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Wrench size={14} />
                  处置操作
                </h4>

                <div className="mb-3">
                  <label className="text-xs text-secondary mb-1 block">
                    备注（可选）
                  </label>
                  <textarea
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="输入处置说明..."
                    className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedAlert.status === 'pending' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye size={14} />}
                      onClick={() =>
                        handleAction(selectedAlert.id, 'processing')
                      }
                    >
                      确认处理
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<SkipForward size={14} />}
                    onClick={() =>
                      handleAction(selectedAlert.id, 'resolved')
                    }
                  >
                    忽略
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle size={14} />}
                    onClick={() =>
                      setConfirmAction({ type: 'markResolved', alertId: selectedAlert.id })
                    }
                  >
                    标记已解决
                  </Button>
                </div>
              </div>
            )}

            {/* 已解决状态提示 */}
            {selectedAlert.status === 'resolved' && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--brand-main)10',
                  color: 'var(--brand-main)',
                }}
              >
                <CheckCircle size={16} />
                此预警已解决
              </div>
            )}

            {/* 关联日志 */}
            <div>
              <button
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'var(--brand-main)' }}
              >
                <Activity size={14} />
                查看关联调用日志
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
