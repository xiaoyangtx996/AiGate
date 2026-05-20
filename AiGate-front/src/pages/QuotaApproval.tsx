import { useState, useCallback, useMemo } from 'react'
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  History,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  User,
  Building2,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Tabs } from '@/components/ui/Tabs'
import { Timeline } from '@/components/ui/Timeline'
import { EmptyState } from '@/components/ui/EmptyState'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RequestStatus = 'pending' | 'approved' | 'rejected'
type ViewRole = 'applicant' | 'approver'

interface ApprovalRequest {
  id: string
  applicant: string
  applicantRole: string
  department: string
  currentQuota: number
  requestedQuota: number
  approvedQuota?: number
  reason: string
  expectedDate: string
  createdAt: string
  status: RequestStatus
  approver?: string
  approverComment?: string
  historyUsage: UsageRecord[]
  recommendedQuota: number
}

interface UsageRecord {
  month: string
  amount: number
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const USAGE_HISTORY: UsageRecord[] = [
  { month: '2025-12', amount: 320 },
  { month: '2026-01', amount: 410 },
  { month: '2026-02', amount: 380 },
  { month: '2026-03', amount: 520 },
  { month: '2026-04', amount: 490 },
  { month: '2026-05', amount: 450 },
]

const MOCK_REQUESTS: ApprovalRequest[] = [
  {
    id: 'QA-2026-0042',
    applicant: '李四',
    applicantRole: '项目负责人',
    department: '产品研发中心 · 前端组',
    currentQuota: 500,
    requestedQuota: 2000,
    reason: 'Cursor copilot 深度使用，本月配额已耗尽，需紧急扩充支持开发工作。团队 6 名成员日常开发强依赖 AI 辅助编码。',
    expectedDate: '2026-05-22',
    createdAt: '2026-05-20 09:30',
    status: 'pending',
    historyUsage: USAGE_HISTORY,
    recommendedQuota: 1500,
  },
  {
    id: 'QA-2026-0041',
    applicant: '王五',
    applicantRole: '部门负责人',
    department: '产品研发中心 · 后端组',
    currentQuota: 2000,
    requestedQuota: 5000,
    reason: '正在进行新版大盘压测，需要大量调用 gpt-4o 接口模拟并发请求，预计持续 2 周。',
    expectedDate: '2026-05-25',
    createdAt: '2026-05-20 08:15',
    status: 'pending',
    historyUsage: USAGE_HISTORY,
    recommendedQuota: 4000,
  },
  {
    id: 'QA-2026-0040',
    applicant: '赵六',
    applicantRole: '普通员工',
    department: '数据智能部 · 算法组',
    currentQuota: 300,
    requestedQuota: 800,
    reason: '正在进行 RAG 知识库建设，需大量调用 Embedding 和 reranker 模型。',
    expectedDate: '2026-05-28',
    createdAt: '2026-05-19 16:40',
    status: 'approved',
    approver: '张三（分公司管理员）',
    approverComment: 'RAG 项目属公司战略方向，批准扩充至 800 元。',
    approvedQuota: 800,
    historyUsage: USAGE_HISTORY,
    recommendedQuota: 700,
  },
  {
    id: 'QA-2026-0039',
    applicant: '孙七',
    applicantRole: '项目负责人',
    department: '产品研发中心 · 移动组',
    currentQuota: 1000,
    requestedQuota: 3000,
    reason: '移动端 UI 自动化测试需要调用视觉模型进行截图比对。',
    expectedDate: '2026-05-20',
    createdAt: '2026-05-18 11:20',
    status: 'rejected',
    approver: '张三（分公司管理员）',
    approverComment: '建议使用开源视觉模型替代，成本更可控。驳回本次申请。',
    historyUsage: USAGE_HISTORY,
    recommendedQuota: 1200,
  },
  {
    id: 'QA-2026-0038',
    applicant: '周八',
    applicantRole: '普通员工',
    department: '数据智能部 · 数据组',
    currentQuota: 200,
    requestedQuota: 600,
    reason: '数据清洗与标注辅助，需调用 GPT-4o-mini 处理大量非结构化数据。',
    expectedDate: '2026-05-30',
    createdAt: '2026-05-17 14:55',
    status: 'approved',
    approver: '李四（部门负责人）',
    approverComment: '数据清洗属日常业务需求，批准。',
    approvedQuota: 600,
    historyUsage: USAGE_HISTORY,
    recommendedQuota: 500,
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusConfig: Record<RequestStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  pending: { label: '待审批', variant: 'warning' },
  approved: { label: '已通过', variant: 'success' },
  rejected: { label: '已驳回', variant: 'error' },
}

function formatCurrency(val: number): string {
  return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Stats row at the top */
function StatsRow({ requests }: { requests: ApprovalRequest[] }) {
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const totalCount = requests.length

  const stats = [
    {
      label: '待审批',
      value: pendingCount,
      unit: '个',
      color: 'var(--brand-accent)',
      icon: <Clock size={22} />,
    },
    {
      label: '已通过',
      value: approvedCount,
      unit: '个',
      color: 'var(--brand-main)',
      icon: <CheckCircle2 size={22} />,
    },
    {
      label: '本月申请总计',
      value: totalCount,
      unit: '个',
      color: 'var(--text-primary)',
      icon: <FileCheck size={22} />,
    },
    {
      label: '平均处理时效',
      value: '1.5',
      unit: '小时',
      color: 'var(--brand-main)',
      icon: <TrendingUp size={22} />,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <Card key={s.label} className="flex items-center justify-between p-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              {s.label}
            </div>
            <div className="text-2xl font-black mt-1" style={{ color: s.color }}>
              {s.value}
              <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>
                {s.unit}
              </span>
            </div>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
              color: s.color,
            }}
          >
            {s.icon}
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Mini bar chart for usage history */
function UsageChart({ data }: { data: UsageRecord[] }) {
  const max = Math.max(...data.map((d) => d.amount))

  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t"
            style={{
              height: `${(d.amount / max) * 100}%`,
              minHeight: 4,
              background: 'var(--brand-main)',
              opacity: 0.7,
            }}
          />
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {d.month.split('-')[1]}月
          </span>
        </div>
      ))}
    </div>
  )
}

/** Application form drawer */
function ApplicationDrawer({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    group: string
    currentQuota: number
    targetQuota: number
    reason: string
    expectedDate: string
  }) => void
}) {
  const [group, setGroup] = useState('前端组')
  const [currentQuota] = useState(500)
  const [targetQuota, setTargetQuota] = useState('')
  const [reason, setReason] = useState('')
  const [expectedDate, setExpectedDate] = useState('')

  const handleSubmit = () => {
    if (!targetQuota || !reason || !expectedDate) return
    onSubmit({
      group,
      currentQuota,
      targetQuota: Number(targetQuota),
      reason,
      expectedDate,
    })
    setTargetQuota('')
    setReason('')
    setExpectedDate('')
    onClose()
  }

  const increasePercent = targetQuota
    ? Math.round(((Number(targetQuota) - currentQuota) / currentQuota) * 100)
    : 0

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="发起配额调整申请"
      description="QUOTA REQUEST"
      width="sm"
    >
      <div className="space-y-5">
        {/* Group selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            申请组织 / 小组
          </label>
          <select className="input" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option>前端组</option>
            <option>后端组</option>
            <option>移动组</option>
            <option>算法组</option>
            <option>测试组</option>
          </select>
        </div>

        {/* Current quota (readonly) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            当前已分配额度 (元)
          </label>
          <input
            type="text"
            className="input font-mono"
            style={{ background: 'var(--bg-elevated)' }}
            value={formatCurrency(currentQuota)}
            readOnly
          />
        </div>

        {/* Target quota */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            申请调至额度 (元)
          </label>
          <input
            type="number"
            className="input font-mono font-bold"
            style={{ color: 'var(--brand-main)' }}
            placeholder="例如：2000"
            value={targetQuota}
            onChange={(e) => setTargetQuota(e.target.value)}
          />
          {increasePercent > 0 && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--brand-accent)' }}>
              <ArrowUpRight size={12} />
              <span>增幅 {increasePercent}%</span>
            </div>
          )}
        </div>

        {/* Expected effective date */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            期望生效时间
          </label>
          <input
            type="date"
            className="input"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            申请理由 (Justification)
          </label>
          <textarea
            className="input text-xs h-28 p-3 resize-none"
            placeholder="请详细说明额度调整的合理商业价值与使用场景..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          取消
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          icon={<Send size={14} />}
          onClick={handleSubmit}
          disabled={!targetQuota || !reason || !expectedDate}
        >
          提交申请
        </Button>
      </div>
    </Drawer>
  )
}

/** Approval detail drawer with history usage + recommended quota */
function ApprovalDetailDrawer({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
}: {
  isOpen: boolean
  onClose: () => void
  request: ApprovalRequest | null
  onApprove: (id: string, quota: number, comment: string) => void
  onReject: (id: string, comment: string) => void
}) {
  const [approvedQuota, setApprovedQuota] = useState('')
  const [comment, setComment] = useState('')

  if (!request) return null

  const isPending = request.status === 'pending'
  const increasePercent = Math.round(
    ((request.requestedQuota - request.currentQuota) / request.currentQuota) * 100
  )

  const timelineItems = [
    {
      id: 'submit',
      title: '申请已提交',
      description: `${request.applicant}（${request.applicantRole}）提交配额调整申请`,
      time: request.createdAt,
      status: 'success' as const,
    },
    ...(request.status !== 'pending'
      ? [
          {
            id: 'review',
            title: request.status === 'approved' ? '申请已通过' : '申请已驳回',
            description: `${request.approver} - ${request.approverComment || ''}`,
            time: '2026-05-20 10:15',
            status: (request.status === 'approved' ? 'success' : 'error') as 'success' | 'error',
          },
        ]
      : [
          {
            id: 'review-pending',
            title: '等待审批',
            description: '当前审批人：张三（分公司管理员）',
            time: '',
            status: 'active' as const,
          },
        ]),
  ]

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="申请详情"
      description={request.id}
      width="md"
    >
      <div className="space-y-6">
        {/* Status banner */}
        <div
          className="flex items-center justify-between p-3 rounded-lg"
          style={{
            background: `color-mix(in srgb, ${
              request.status === 'approved'
                ? 'var(--brand-main)'
                : request.status === 'rejected'
                ? 'var(--brand-accent)'
                : 'var(--brand-accent)'
            } 8%, transparent)`,
          }}
        >
          <div className="flex items-center gap-2">
            {request.status === 'approved' && <CheckCircle2 size={16} style={{ color: 'var(--brand-main)' }} />}
            {request.status === 'rejected' && <XCircle size={16} style={{ color: 'var(--brand-accent)' }} />}
            {request.status === 'pending' && <Clock size={16} style={{ color: 'var(--brand-accent)' }} />}
            <span className="text-sm font-bold">{statusConfig[request.status].label}</span>
          </div>
          <Badge variant={statusConfig[request.status].variant}>
            {request.status === 'approved' ? formatCurrency(request.approvedQuota || request.requestedQuota) : request.id}
          </Badge>
        </div>

        {/* Applicant info */}
        <Card className="p-4">
          <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            申请人信息
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>申请人</span>
              <span className="font-bold">{request.applicant}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>角色</span>
              <span className="font-bold">{request.applicantRole}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Building2 size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>部门</span>
              <span className="font-bold">{request.department}</span>
            </div>
          </div>
        </Card>

        {/* Quota comparison */}
        <Card className="p-4">
          <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            配额调整明细
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>当前配额</div>
              <div className="text-lg font-mono font-black mt-1">{formatCurrency(request.currentQuota)}</div>
            </div>
            <ArrowUpRight size={20} style={{ color: 'var(--brand-main)' }} />
            <div className="flex-1 text-center p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>申请额度</div>
              <div className="text-lg font-mono font-black mt-1" style={{ color: 'var(--brand-main)' }}>
                {formatCurrency(request.requestedQuota)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs" style={{ color: 'var(--brand-accent)' }}>
            <TrendingUp size={12} />
            <span>增幅 {increasePercent}%</span>
            <span style={{ color: 'var(--text-secondary)' }}>|</span>
            <Calendar size={12} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>期望生效：{request.expectedDate}</span>
          </div>
        </Card>

        {/* Reason */}
        <Card className="p-4">
          <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
            申请理由
          </h4>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {request.reason}
          </p>
        </Card>

        {/* Historical usage */}
        <Card className="p-4">
          <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            近 6 个月用量趋势
          </h4>
          <UsageChart data={request.historyUsage} />
          <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>月均：¥{Math.round(request.historyUsage.reduce((s, d) => s + d.amount, 0) / request.historyUsage.length)}</span>
            <span>峰值：¥{Math.max(...request.historyUsage.map((d) => d.amount))}</span>
          </div>
        </Card>

        {/* System recommendation */}
        <Card
          className="p-4"
          style={{
            background: 'color-mix(in srgb, var(--brand-main) 6%, var(--bg-surface))',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} style={{ color: 'var(--brand-main)' }} />
            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--brand-main)' }}>
              系统推荐额度
            </h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black" style={{ color: 'var(--brand-main)' }}>
              {formatCurrency(request.recommendedQuota)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              基于近 6 个月用量 + 30% 缓冲
            </span>
          </div>
        </Card>

        {/* Timeline */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            审批流程
          </h4>
          <Timeline items={timelineItems} />
        </div>

        {/* Approval actions (only for pending) */}
        {isPending && (
          <div
            className="pt-4 border-t space-y-4"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                核定调整额度 (元)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input font-mono font-bold flex-1"
                  style={{ color: 'var(--brand-main)' }}
                  placeholder={String(request.recommendedQuota)}
                  value={approvedQuota}
                  onChange={(e) => setApprovedQuota(e.target.value)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setApprovedQuota(String(request.recommendedQuota))}
                >
                  采用推荐
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                审批意见
              </label>
              <textarea
                className="input text-xs h-16 p-3 resize-none"
                placeholder="输入审批通过或驳回的详细理由..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
                onClick={() => {
                  onReject(request.id, comment)
                  setApprovedQuota('')
                  setComment('')
                  onClose()
                }}
              >
                驳回申请
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  const quota = approvedQuota ? Number(approvedQuota) : request.recommendedQuota
                  onApprove(request.id, quota, comment)
                  setApprovedQuota('')
                  setComment('')
                  onClose()
                }}
              >
                同意并更新配额
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}

/** Applicant perspective: my application history table */
function MyRequestsTable({
  requests,
  onViewDetail,
}: {
  requests: ApprovalRequest[]
  onViewDetail: (req: ApprovalRequest) => void
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FileCheck}
        title="暂无申请记录"
        description="您还没有发起过配额调整申请"
      />
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead
            className="text-xs border-b"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <tr>
              <th className="p-4">申请单号</th>
              <th className="p-4">配额调整</th>
              <th className="p-4">申请时间</th>
              <th className="p-4">期望生效</th>
              <th className="p-4">状态</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr
                key={req.id}
                className="border-b transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <td className="p-4 font-mono font-bold">{req.id}</td>
                <td className="p-4">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(req.currentQuota)}
                  </div>
                  <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand-main)' }}>
                    申请至 {formatCurrency(req.requestedQuota)}
                  </div>
                </td>
                <td className="p-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {req.createdAt}
                </td>
                <td className="p-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {req.expectedDate}
                </td>
                <td className="p-4">
                  <Badge variant={statusConfig[req.status].variant}>
                    {statusConfig[req.status].label}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(req)}>
                    详情
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** Approver perspective: pending approval table */
function PendingApprovalTable({
  requests,
  onOpenApproval,
}: {
  requests: ApprovalRequest[]
  onOpenApproval: (req: ApprovalRequest) => void
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="暂无待审批申请"
        description="当前没有需要处理的配额调整申请"
      />
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div
        className="p-4 border-b flex justify-between items-center"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
      >
        <h3 className="font-bold text-sm">待审批申请列表</h3>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          共 {requests.length} 个待处理
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead
            className="text-xs border-b"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <tr>
              <th className="p-4">申请单号</th>
              <th className="p-4">申请人</th>
              <th className="p-4">配额调整</th>
              <th className="p-4">申请原因</th>
              <th className="p-4">期望生效</th>
              <th className="p-4">申请时间</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr
                key={req.id}
                className="border-b transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <td className="p-4 font-mono font-bold">{req.id}</td>
                <td className="p-4">
                  <div className="font-bold">{req.applicant}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {req.department}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(req.currentQuota)}
                  </div>
                  <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand-main)' }}>
                    申请至 {formatCurrency(req.requestedQuota)}
                  </div>
                </td>
                <td className="p-4 text-xs max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {req.reason}
                </td>
                <td className="p-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {req.expectedDate}
                </td>
                <td className="p-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {req.createdAt}
                </td>
                <td className="p-4 text-right">
                  <Button variant="primary" size="sm" onClick={() => onOpenApproval(req)}>
                    审批
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** Approved/Rejected history table */
function ApprovalHistoryTable({
  requests,
  onViewDetail,
}: {
  requests: ApprovalRequest[]
  onViewDetail: (req: ApprovalRequest) => void
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="暂无审批历史"
        description="还没有已处理的配额申请"
      />
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead
            className="text-xs border-b"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <tr>
              <th className="p-4">申请单号</th>
              <th className="p-4">申请人</th>
              <th className="p-4">配额调整</th>
              <th className="p-4">审批人</th>
              <th className="p-4">审批意见</th>
              <th className="p-4">状态</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr
                key={req.id}
                className="border-b transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <td className="p-4 font-mono font-bold">{req.id}</td>
                <td className="p-4">
                  <div>{req.applicant}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {req.department}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(req.currentQuota)}
                  </div>
                  <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand-main)' }}>
                    {req.status === 'approved'
                      ? `批准至 ${formatCurrency(req.approvedQuota || req.requestedQuota)}`
                      : `申请至 ${formatCurrency(req.requestedQuota)}`}
                  </div>
                </td>
                <td className="p-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {req.approver || '-'}
                </td>
                <td className="p-4 text-xs max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {req.approverComment || '-'}
                </td>
                <td className="p-4">
                  <Badge variant={statusConfig[req.status].variant}>
                    {statusConfig[req.status].label}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(req)}>
                    详情
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function QuotaApproval() {
  /* -- state -- */
  const [requests, setRequests] = useState<ApprovalRequest[]>(MOCK_REQUESTS)
  const [viewRole, setViewRole] = useState<ViewRole>('approver')
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'history'>('pending')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)

  /* -- derived -- */
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests])
  const historyRequests = useMemo(() => requests.filter((r) => r.status !== 'pending'), [requests])
  const myRequests = useMemo(() => requests, [requests]) // In real app, filter by current user

  /* -- handlers -- */
  const handleNewRequest = useCallback(
    (data: { group: string; currentQuota: number; targetQuota: number; reason: string; expectedDate: string }) => {
      const newReq: ApprovalRequest = {
        id: `QA-2026-00${Math.floor(Math.random() * 900) + 100}`,
        applicant: '演示用户',
        applicantRole: '项目负责人',
        department: `产品研发中心 · ${data.group}`,
        currentQuota: data.currentQuota,
        requestedQuota: data.targetQuota,
        reason: data.reason,
        expectedDate: data.expectedDate,
        createdAt: new Date().toLocaleString('zh-CN'),
        status: 'pending',
        historyUsage: USAGE_HISTORY,
        recommendedQuota: Math.round(data.targetQuota * 0.85),
      }
      setRequests((prev) => [newReq, ...prev])
    },
    [],
  )

  const handleApprove = useCallback((id: string, quota: number, comment: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'approved' as const,
              approvedQuota: quota,
              approver: '张三（分公司管理员）',
              approverComment: comment || '批准',
            }
          : r,
      ),
    )
  }, [])

  const handleReject = useCallback((id: string, comment: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected' as const,
              approver: '张三（分公司管理员）',
              approverComment: comment || '驳回',
            }
          : r,
      ),
    )
  }, [])

  const openDetail = useCallback((req: ApprovalRequest) => {
    setSelectedRequest(req)
    setDetailDrawerOpen(true)
  }, [])

  /* -- tabs config -- */
  const roleTabs = [
    { id: 'approver', label: '审批视角', icon: <FileCheck size={14} /> },
    { id: 'applicant', label: '发起视角', icon: <Send size={14} /> },
  ]

  const approvalSubTabs = [
    { id: 'pending', label: '待审批', count: pendingRequests.length, icon: <Clock size={14} /> },
    { id: 'history', label: '已处理', count: historyRequests.length, icon: <History size={14} /> },
  ]

  /* -- render -- */
  return (
    <div>
      <PageHeader
        title="配额审批中心"
        subtitle="处理下属部门与项目的配额扩容申请，或发起新的额度调整申请。"
        breadcrumbs={[{ label: '组织治理' }, { label: '配额审批' }]}
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setDrawerOpen(true)}
          >
            发起申请
          </Button>
        }
      />

      {/* Role switch */}
      <div className="mb-6">
        <Tabs tabs={roleTabs} activeTab={viewRole} onChange={(id) => setViewRole(id as ViewRole)} />
      </div>

      {/* Stats */}
      <StatsRow requests={requests} />

      {/* Approver perspective */}
      {viewRole === 'approver' && (
        <div>
          <div className="mb-4">
            <Tabs
              tabs={approvalSubTabs}
              activeTab={approvalSubTab}
              onChange={(id) => setApprovalSubTab(id as 'pending' | 'history')}
            />
          </div>

          {approvalSubTab === 'pending' ? (
            <PendingApprovalTable requests={pendingRequests} onOpenApproval={openDetail} />
          ) : (
            <ApprovalHistoryTable requests={historyRequests} onViewDetail={openDetail} />
          )}
        </div>
      )}

      {/* Applicant perspective */}
      {viewRole === 'applicant' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">我的申请记录</h3>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              共 {myRequests.length} 条记录
            </span>
          </div>
          <MyRequestsTable requests={myRequests} onViewDetail={openDetail} />
        </div>
      )}

      {/* New request drawer */}
      <ApplicationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onSubmit={handleNewRequest} />

      {/* Approval detail drawer */}
      <ApprovalDetailDrawer
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        request={selectedRequest}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}
