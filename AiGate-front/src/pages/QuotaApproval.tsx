import { useState, useCallback } from 'react'
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'

/* ---------- Types ---------- */

interface ApprovalRequest {
  id: string
  applicant: string
  group: string
  currentQuota: string
  requestedQuota: string
  reason: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
}

/* ---------- Mock Data ---------- */

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'QA-2026-0042',
    applicant: '李四',
    group: '产品研发中心 · 前端组',
    currentQuota: '¥500.00',
    requestedQuota: '¥2,000.00',
    reason: 'Cursor copilot 深度使用，本月配额已耗尽，需紧急扩充支持开发工作。',
    createdAt: '10分钟前',
    status: 'pending',
  },
  {
    id: 'QA-2026-0041',
    applicant: '王五',
    group: '产品研发中心 · 后端组',
    currentQuota: '¥2,000.00',
    requestedQuota: '¥5,000.00',
    reason: '正在进行新版大盘压测，需要大量调用 gpt-4o 接口模拟并发请求。',
    createdAt: '1小时前',
    status: 'pending',
  },
]

/* ---------- Component ---------- */

export default function QuotaApproval() {
  /* -- state -- */
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_REQUESTS)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<ApprovalRequest | null>(null)
  const [approvalQuota, setApprovalQuota] = useState('')
  const [approvalComment, setApprovalComment] = useState('')

  /* -- drawer form state -- */
  const [reqGroup, setReqGroup] = useState('前端组')
  const [reqCurrentVal] = useState('500.00')
  const [reqTargetVal, setReqTargetVal] = useState('')
  const [reqJustification, setReqJustification] = useState('')

  /* -- derived -- */
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  /* -- handlers -- */
  const openApprovalModal = useCallback((req: ApprovalRequest) => {
    setSelected(req)
    setApprovalQuota(req.requestedQuota.replace('¥', '').replace(',', ''))
    setApprovalComment('')
    setModalOpen(true)
  }, [])

  const submitApproval = useCallback(
    (status: 'approved' | 'rejected') => {
      if (!selected) return
      setRequests((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, status } : r)),
      )
      setModalOpen(false)
    },
    [selected],
  )

  const submitNewRequest = useCallback(() => {
    if (!reqTargetVal || !reqJustification) return
    const newId = `QA-2026-00${Math.floor(Math.random() * 90) + 10}`
    const newReq: ApprovalRequest = {
      id: newId,
      applicant: '演示用户',
      group: `产品研发中心 · ${reqGroup}`,
      currentQuota: `¥${reqCurrentVal}`,
      requestedQuota: `¥${reqTargetVal}`,
      reason: reqJustification,
      createdAt: '刚刚',
      status: 'pending',
    }
    setRequests((prev) => [newReq, ...prev])
    setReqTargetVal('')
    setReqJustification('')
    setDrawerOpen(false)
  }, [reqGroup, reqCurrentVal, reqTargetVal, reqJustification])

  /* ---------- Stats Cards ---------- */

  const stats = [
    {
      label: '待我审批',
      value: pendingCount,
      unit: '个待处理',
      color: 'var(--brand-main)',
      bgColor: 'var(--brand-main)',
      icon: <FileCheck size={22} />,
    },
    {
      label: '本月已审批',
      value: 12,
      unit: '个申请',
      color: 'var(--text-primary)',
      bgColor: 'var(--text-secondary)',
      icon: <CheckCircle2 size={22} />,
    },
    {
      label: '平均处理时效',
      value: '1.5',
      unit: '小时',
      color: 'var(--brand-accent)',
      bgColor: 'var(--brand-accent)',
      icon: <Clock size={22} />,
    },
  ]

  /* ---------- Render ---------- */

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="flex items-center justify-between p-5">
            <div>
              <div className="text-secondary text-xs font-bold uppercase tracking-widest">
                {s.label}
              </div>
              <div
                className="text-3xl font-black mt-1"
                style={{ color: s.color }}
              >
                {s.value}{' '}
                <span className="text-xs text-secondary font-normal">
                  {s.unit}
                </span>
              </div>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${s.bgColor} 10%, transparent)`,
                color: s.color,
              }}
            >
              {s.icon}
            </div>
          </Card>
        ))}
      </div>

      {/* Approval Table */}
      <Card className="p-0 overflow-hidden mb-8">
        <div
          className="p-4 border-b flex justify-between items-center"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h3 className="font-bold text-sm">待审批申请单列表</h3>
          <span className="text-xs text-secondary">
            共有 {pendingCount} 个待处理申请
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="text-xs text-secondary border-b"
              style={{
                background: 'var(--bg-elevated)',
                borderColor: 'var(--border-color)',
              }}
            >
              <tr>
                <th className="p-4">申请单号</th>
                <th className="p-4">申请人</th>
                <th className="p-4">配额调整</th>
                <th className="p-4">申请原因</th>
                <th className="p-4">申请时间</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className="border-b transition-colors hover:bg-elevated"
                  style={{
                    borderColor: 'var(--border-color)',
                    opacity: req.status !== 'pending' ? 0.5 : 1,
                  }}
                >
                  <td className="p-4 font-mono font-bold">{req.id}</td>
                  <td className="p-4">
                    <div>{req.applicant}</div>
                    <div className="text-xs text-secondary mt-0.5">
                      {req.group}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>{req.currentQuota}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand-main)' }}>
                      申请调至 {req.requestedQuota}
                    </div>
                  </td>
                  <td className="p-4 text-secondary max-w-xs">
                    {req.reason}
                  </td>
                  <td className="p-4 text-secondary">{req.createdAt}</td>
                  <td className="p-4 text-right">
                    {req.status === 'pending' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openApprovalModal(req)}
                      >
                        审批
                      </Button>
                    ) : req.status === 'approved' ? (
                      <Badge variant="success">已通过</Badge>
                    ) : (
                      <Badge variant="error">已驳回</Badge>
                    )}
                  </td>
                </tr>
              ))}

              {requests.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-secondary text-sm"
                  >
                    暂无待审批申请
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approval Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="配额调整单审批"
        size="md"
      >
        {selected && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="neutral">{selected.id}</Badge>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-secondary">申请人员:</span>
                <span className="font-bold">
                  {selected.applicant} ({selected.group.split(' · ')[1]})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">当前配额:</span>
                <span className="font-mono text-secondary">
                  {selected.currentQuota}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">期望配额:</span>
                <span
                  className="font-mono font-bold"
                  style={{ color: 'var(--brand-main)' }}
                >
                  {selected.requestedQuota}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-secondary">申请事由:</span>
                <div
                  className="p-3 rounded border text-xs text-secondary leading-relaxed"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  {selected.reason}
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest">
                  核定调整额度 (元)
                </label>
                <input
                  type="number"
                  className="input font-mono font-bold"
                  style={{ color: 'var(--brand-main)' }}
                  value={approvalQuota}
                  onChange={(e) => setApprovalQuota(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest">
                  审批意见
                </label>
                <textarea
                  className="input text-xs h-16 p-3 resize-none"
                  placeholder="输入审批通过或驳回的详细理由..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-grow"
                style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent)' }}
                onClick={() => submitApproval('rejected')}
              >
                驳回申请
              </Button>
              <Button
                variant="primary"
                className="flex-grow"
                onClick={() => submitApproval('approved')}
              >
                同意并更新配额
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* New Request Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="发起配额调整申请"
        description="QUOTA REQUEST"
        width="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest">
              申请组织/小组
            </label>
            <select
              className="input"
              value={reqGroup}
              onChange={(e) => setReqGroup(e.target.value)}
            >
              <option>前端组</option>
              <option>后端组</option>
              <option>移动组</option>
              <option>测试组</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest">
              当前已分配额度 (元)
            </label>
            <input
              type="text"
              className="input font-mono"
              style={{ background: 'var(--bg-elevated)' }}
              value={reqCurrentVal}
              readOnly
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest">
              申请调至额度 (元)
            </label>
            <input
              type="number"
              className="input font-mono font-bold"
              style={{ color: 'var(--brand-main)' }}
              placeholder="例如：2000"
              value={reqTargetVal}
              onChange={(e) => setReqTargetVal(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest">
              申请理由 (Justification)
            </label>
            <textarea
              className="input text-xs h-28 p-3 resize-none"
              placeholder="请详细说明您的额度调大请求的合理商业价值与使用场景..."
              value={reqJustification}
              onChange={(e) => setReqJustification(e.target.value)}
            />
          </div>
        </div>

        <div
          className="mt-6 pt-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setDrawerOpen(false)}
          >
            取消
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={submitNewRequest}
          >
            提交申请
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
