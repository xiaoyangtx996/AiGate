import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import {
  Download,
  Search,
  Info,
  Clock,
  User,
  Target,
  Globe,
  FileText,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AuditType = 'quota' | 'revoke' | 'permission' | 'mcp' | 'agent'

interface AuditRecord {
  id: string
  time: string
  actor: string
  type: AuditType
  typeLabel: string
  target: string
  ip: string
  before: string
  after: string
}

interface AuditTypeOption {
  value: string
  label: string
}

interface TimeRangeOption {
  value: string
  label: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const auditTypeBadgeVariant: Record<AuditType, 'warning' | 'error' | 'success' | 'info' | 'neutral'> = {
  quota: 'warning',
  revoke: 'error',
  permission: 'success',
  mcp: 'info',
  agent: 'neutral',
}

const auditTypeOptions: AuditTypeOption[] = [
  { value: '', label: '全部类型' },
  { value: 'quota', label: '配额调整' },
  { value: 'revoke', label: '密钥吊销' },
  { value: 'permission', label: '权限变更' },
  { value: 'mcp', label: 'MCP 注册' },
  { value: 'agent', label: 'Agent 创建' },
]

const timeRangeOptions: TimeRangeOption[] = [
  { value: 'today', label: '今天' },
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
]

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const mockRecords: AuditRecord[] = [
  {
    id: '1',
    time: '2026-05-17 14:20:11',
    actor: '张三 (集团 IT 管理员)',
    type: 'quota',
    typeLabel: '配额调整',
    target: '北京研发中心',
    ip: '192.168.1.104',
    before: '- "quota_limit": 500.00\n- "status": "warning"',
    after: '+ "quota_limit": 2000.00\n+ "status": "normal"',
  },
  {
    id: '2',
    time: '2026-05-17 11:05:42',
    actor: '张三 (集团 IT 管理员)',
    type: 'permission',
    typeLabel: '权限变更',
    target: '前端组-李四密钥',
    ip: '192.168.1.104',
    before: '- "scope": ["read"]\n- "expire_in": 86400',
    after: '+ "scope": ["read", "write", "admin"]\n+ "expire_in": 31536000',
  },
  {
    id: '3',
    time: '2026-05-16 17:33:09',
    actor: '李四 (分公司管理员)',
    type: 'revoke',
    typeLabel: '密钥吊销',
    target: 'ag-prod-b7c2 密钥',
    ip: '10.0.2.55',
    before: '- "status": "active"\n- "expire_at": "2026-12-31"',
    after: '+ "status": "revoked"\n+ "revoked_at": "2026-05-16"',
  },
  {
    id: '4',
    time: '2026-05-16 14:10:22',
    actor: '王五 (集团 IT 管理员)',
    type: 'mcp',
    typeLabel: 'MCP 注册',
    target: 'code-review 工具',
    ip: '192.168.1.88',
    before: '(无变更前状态)',
    after: '+ "tool_name": "code-review"\n+ "endpoint": "https://mcp.internal/review"\n+ "status": "active"',
  },
  {
    id: '5',
    time: '2026-05-15 09:45:00',
    actor: '张三 (集团 IT 管理员)',
    type: 'agent',
    typeLabel: 'Agent 创建',
    target: 'SLA 运维助手',
    ip: '192.168.1.104',
    before: '(无变更前状态)',
    after: '+ "agent_name": "SLA 运维助手"\n+ "model": "gpt-4o"\n+ "knowledge_base": "SLA 运维手册"',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Audit() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterActor, setFilterActor] = useState('')
  const [filterTimeRange, setFilterTimeRange] = useState('7d')

  const filteredRecords = mockRecords.filter((r) => {
    if (filterType && r.type !== filterType) return false
    if (filterActor && !r.actor.includes(filterActor)) return false
    return true
  })

  function openDrawer(record: AuditRecord) {
    setSelectedRecord(record)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
  }

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="操作审计日志"
        subtitle="记录系统管理员与租户管理员的安全变更操作，合规审计留存 365 天。"
        breadcrumbs={[{ label: '监控与合规' }, { label: '操作审计' }]}
        actions={
          <>
            <Badge variant="neutral">
              <span className="font-mono text-xs">留存期: 365天</span>
            </Badge>
            <Button variant="primary" size="sm" icon={<Download size={16} />}>
              导出审计包
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div
        className="card mb-6 flex flex-wrap gap-4 items-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
      >
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            操作类型
          </label>
          <select
            className="input-base w-full"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {auditTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            操作人
          </label>
          <input
            type="text"
            className="input-base w-full"
            placeholder="用户名或 ID"
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
          />
        </div>
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">
            时间范围
          </label>
          <select
            className="input-base w-full"
            value={filterTimeRange}
            onChange={(e) => setFilterTimeRange(e.target.value)}
          >
            {timeRangeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" icon={<Search size={16} />}>
          查询
        </Button>
      </div>

      {/* Audit Table */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead
            className="border-b text-xs text-secondary uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
          >
            <tr>
              <th className="p-4">时间</th>
              <th className="p-4">操作人</th>
              <th className="p-4">操作类型</th>
              <th className="p-4">目标对象</th>
              <th className="p-4">源 IP</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-secondary">
                  暂无审计记录
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="p-4 text-secondary text-xs">{record.time}</td>
                  <td className="p-4 font-bold">{record.actor}</td>
                  <td className="p-4">
                    <Badge variant={auditTypeBadgeVariant[record.type]}>
                      {record.typeLabel}
                    </Badge>
                  </td>
                  <td className="p-4">{record.target}</td>
                  <td className="p-4 font-mono text-xs">{record.ip}</td>
                  <td className="p-4 text-right">
                    <button
                      className="text-brand-main font-bold text-xs hover:underline"
                      onClick={() => openDrawer(record)}
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title="审计日志详情"
        description="AUDIT DETAIL"
        width="sm"
      >
        {selectedRecord && (
          <div className="space-y-5 text-sm">
            {/* Meta info grid */}
            <div
              className="grid grid-cols-2 gap-4 pb-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> 操作时间
                </div>
                <div className="font-medium mt-1">{selectedRecord.time}</div>
              </div>
              <div>
                <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Globe size={12} /> 源 IP 地址
                </div>
                <div className="font-mono mt-1">{selectedRecord.ip}</div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <User size={12} /> 操作人
                </div>
                <div className="font-bold mt-1">{selectedRecord.actor}</div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <FileText size={12} /> 操作类型
                </div>
                <div className="mt-1">
                  <Badge variant={auditTypeBadgeVariant[selectedRecord.type]}>
                    {selectedRecord.typeLabel}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Target */}
            <div>
              <div className="text-xs text-secondary font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                <Target size={12} /> 变更对象
              </div>
              <div
                className="p-3 border rounded font-bold"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                }}
              >
                {selectedRecord.target}
              </div>
            </div>

            {/* Diff view */}
            <div className="space-y-2">
              <div className="text-xs text-secondary font-bold uppercase tracking-wider">
                操作前后 Diff 差异
              </div>
              <div
                className="border rounded overflow-hidden"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div
                  className="flex border-b text-xs font-bold"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    className="w-1/2 p-2 border-r"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    变更前 (Before)
                  </div>
                  <div className="w-1/2 p-2">变更后 (After)</div>
                </div>
                <div className="flex font-mono text-xs h-40">
                  <div
                    className="w-1/2 p-3 bg-red-500/10 text-red-500 border-r overflow-y-auto whitespace-pre-wrap"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {selectedRecord.before}
                  </div>
                  <div className="w-1/2 p-3 bg-green-500/10 text-green-500 overflow-y-auto whitespace-pre-wrap">
                    {selectedRecord.after}
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance notice */}
            <div className="p-4 bg-blue-500/10 text-blue-500 text-xs rounded border border-blue-500/20 leading-relaxed flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                审计日志已签名并归档至只读区块链哈希存证，合规审计留存期为 365
                天，任何人（包括超级管理员）均无法篡改或删除。
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" className="w-full" onClick={closeDrawer}>
            关闭详情
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
