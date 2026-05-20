import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'
import {
  Download,
  Search,
  Info,
  Clock,
  User,
  Target,
  Globe,
  FileText,
  Shield,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertTriangle,
  Key,
  Users,
  Settings,
  Bot,
  Puzzle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AuditType =
  | 'quota'
  | 'revoke'
  | 'permission'
  | 'mcp'
  | 'agent'
  | 'user_mgmt'
  | 'system_config'
  | 'key_create'

interface AuditRecord {
  id: string
  time: string
  actor: string
  actorRole: string
  type: AuditType
  typeLabel: string
  target: string
  targetDetail: string
  ip: string
  before: string
  after: string
  riskLevel: 'low' | 'medium' | 'high'
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AUDIT_TYPE_CONFIG: Record<
  AuditType,
  {
    label: string
    badgeVariant: 'warning' | 'error' | 'success' | 'info' | 'neutral'
    icon: typeof Shield
  }
> = {
  quota: { label: '配额调整', badgeVariant: 'warning', icon: Settings },
  revoke: { label: '密钥吊销', badgeVariant: 'error', icon: Key },
  permission: { label: '权限变更', badgeVariant: 'success', icon: Shield },
  mcp: { label: 'MCP 注册', badgeVariant: 'info', icon: Puzzle },
  agent: { label: 'Agent 创建', badgeVariant: 'neutral', icon: Bot },
  user_mgmt: { label: '用户管理', badgeVariant: 'warning', icon: Users },
  system_config: { label: '系统配置', badgeVariant: 'error', icon: Settings },
  key_create: { label: '密钥创建', badgeVariant: 'success', icon: Key },
}

const AUDIT_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  ...Object.entries(AUDIT_TYPE_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  })),
]

const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
  { value: '90d', label: '最近 90 天' },
  { value: '365d', label: '最近 365 天' },
]

const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'error' }
> = {
  low: { label: '低风险', variant: 'success' },
  medium: { label: '中风险', variant: 'warning' },
  high: { label: '高风险', variant: 'error' },
}

const PAGE_SIZE = 10

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const mockRecords: AuditRecord[] = [
  {
    id: '1',
    time: '2026-05-20 14:20:11',
    actor: '张三',
    actorRole: '集团 IT 管理员',
    type: 'quota',
    typeLabel: '配额调整',
    target: '北京研发中心',
    targetDetail: '集团 / 北京研发中心 / 月度配额',
    ip: '192.168.1.104',
    before: '{\n  "quota_limit": 500.00,\n  "status": "warning",\n  "period": "monthly"\n}',
    after: '{\n  "quota_limit": 2000.00,\n  "status": "normal",\n  "period": "monthly"\n}',
    riskLevel: 'medium',
  },
  {
    id: '2',
    time: '2026-05-20 11:05:42',
    actor: '张三',
    actorRole: '集团 IT 管理员',
    type: 'permission',
    typeLabel: '权限变更',
    target: '前端组-李四密钥',
    targetDetail: 'ag-prod-8f2c 权限范围',
    ip: '192.168.1.104',
    before: '{\n  "scope": ["read"],\n  "expire_in": 86400,\n  "rate_limit": 100\n}',
    after: '{\n  "scope": ["read", "write", "admin"],\n  "expire_in": 31536000,\n  "rate_limit": 1000\n}',
    riskLevel: 'high',
  },
  {
    id: '3',
    time: '2026-05-19 17:33:09',
    actor: '李四',
    actorRole: '分公司管理员',
    type: 'revoke',
    typeLabel: '密钥吊销',
    target: 'ag-prod-b7c2 密钥',
    targetDetail: '上海分公司 / 测试组 / 生产密钥',
    ip: '10.0.2.55',
    before: '{\n  "status": "active",\n  "expire_at": "2026-12-31",\n  "daily_quota": 5000\n}',
    after: '{\n  "status": "revoked",\n  "revoked_at": "2026-05-19",\n  "revoke_reason": "密钥泄露风险"\n}',
    riskLevel: 'high',
  },
  {
    id: '4',
    time: '2026-05-19 14:10:22',
    actor: '王五',
    actorRole: '集团 IT 管理员',
    type: 'mcp',
    typeLabel: 'MCP 注册',
    target: 'code-review 工具',
    targetDetail: '公共 MCP 市场 / 开发效率类',
    ip: '192.168.1.88',
    before: '(无变更前状态)',
    after: '{\n  "tool_name": "code-review",\n  "endpoint": "https://mcp.internal/review",\n  "status": "active",\n  "auth_type": "api_key"\n}',
    riskLevel: 'low',
  },
  {
    id: '5',
    time: '2026-05-18 09:45:00',
    actor: '张三',
    actorRole: '集团 IT 管理员',
    type: 'agent',
    typeLabel: 'Agent 创建',
    target: 'SLA 运维助手',
    targetDetail: '运维部 / 基础设施 Agent',
    ip: '192.168.1.104',
    before: '(无变更前状态)',
    after: '{\n  "agent_name": "SLA 运维助手",\n  "model": "gpt-4o",\n  "knowledge_base": "SLA 运维手册",\n  "max_tokens": 4096\n}',
    riskLevel: 'low',
  },
  {
    id: '6',
    time: '2026-05-18 08:20:15',
    actor: '赵六',
    actorRole: '部门负责人',
    type: 'key_create',
    typeLabel: '密钥创建',
    target: 'ag-stg-9d4e 密钥',
    targetDetail: '北京研发中心 / 前端开发组 / 测试环境',
    ip: '192.168.1.56',
    before: '(无变更前状态)',
    after: '{\n  "key_id": "ag-stg-9d4e",\n  "env": "staging",\n  "scope": ["read", "write"],\n  "expire_at": "2026-08-20"\n}',
    riskLevel: 'low',
  },
  {
    id: '7',
    time: '2026-05-17 16:45:30',
    actor: '张三',
    actorRole: '集团 IT 管理员',
    type: 'system_config',
    typeLabel: '系统配置',
    target: '全局限流策略',
    targetDetail: '系统设置 / 网关配置 / 限流参数',
    ip: '192.168.1.104',
    before: '{\n  "global_rate_limit": 10000,\n  "per_user_limit": 100,\n  "burst_enabled": false\n}',
    after: '{\n  "global_rate_limit": 50000,\n  "per_user_limit": 500,\n  "burst_enabled": true,\n  "burst_size": 1000\n}',
    riskLevel: 'high',
  },
  {
    id: '8',
    time: '2026-05-17 10:12:08',
    actor: '李四',
    actorRole: '分公司管理员',
    type: 'user_mgmt',
    typeLabel: '用户管理',
    target: '新员工-陈七',
    targetDetail: '上海分公司 / 后端开发组 / 普通员工',
    ip: '10.0.2.55',
    before: '(无变更前状态)',
    after: '{\n  "user_name": "陈七",\n  "department": "后端开发组",\n  "role": "user",\n  "status": "active"\n}',
    riskLevel: 'low',
  },
  {
    id: '9',
    time: '2026-05-16 15:30:22',
    actor: '王五',
    actorRole: '集团 IT 管理员',
    type: 'quota',
    typeLabel: '配额调整',
    target: '上海分公司',
    targetDetail: '集团 / 上海分公司 / 季度配额',
    ip: '192.168.1.88',
    before: '{\n  "quota_limit": 10000.00,\n  "used": 8500.00,\n  "status": "warning"\n}',
    after: '{\n  "quota_limit": 25000.00,\n  "used": 8500.00,\n  "status": "normal"\n}',
    riskLevel: 'medium',
  },
  {
    id: '10',
    time: '2026-05-16 09:15:44',
    actor: '张三',
    actorRole: '集团 IT 管理员',
    type: 'mcp',
    typeLabel: 'MCP 注册',
    target: 'data-analyzer 工具',
    targetDetail: '公共 MCP 市场 / 数据分析类',
    ip: '192.168.1.104',
    before: '(无变更前状态)',
    after: '{\n  "tool_name": "data-analyzer",\n  "endpoint": "https://mcp.internal/analyzer",\n  "status": "pending_review",\n  "auth_type": "oauth2"\n}',
    riskLevel: 'low',
  },
  {
    id: '11',
    time: '2026-05-15 14:22:10',
    actor: '赵六',
    actorRole: '部门负责人',
    type: 'permission',
    typeLabel: '权限变更',
    target: '前端组全员密钥',
    targetDetail: '北京研发中心 / 前端开发组 / 批量权限',
    ip: '192.168.1.56',
    before: '{\n  "scope": ["read"],\n  "models": ["gpt-4o-mini"]\n}',
    after: '{\n  "scope": ["read", "write"],\n  "models": ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"]\n}',
    riskLevel: 'medium',
  },
  {
    id: '12',
    time: '2026-05-15 11:08:33',
    actor: '李四',
    actorRole: '分公司管理员',
    type: 'agent',
    typeLabel: 'Agent 创建',
    target: '客服知识问答',
    targetDetail: '上海分公司 / 客服部 / 业务 Agent',
    ip: '10.0.2.55',
    before: '(无变更前状态)',
    after: '{\n  "agent_name": "客服知识问答",\n  "model": "gpt-4o",\n  "knowledge_base": "产品FAQ",\n  "temperature": 0.3\n}',
    riskLevel: 'low',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Audit() {
  const { addToast } = useUIStore()

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null)

  // Filter state
  const [filterType, setFilterType] = useState('')
  const [filterActor, setFilterActor] = useState('')
  const [filterTarget, setFilterTarget] = useState('')
  const [filterTimeRange, setFilterTimeRange] = useState('30d')
  const [filterRisk, setFilterRisk] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Filtered records
  const filteredRecords = useMemo(() => {
    return mockRecords.filter((r) => {
      if (filterType && r.type !== filterType) return false
      if (filterActor && !r.actor.includes(filterActor) && !r.actorRole.includes(filterActor))
        return false
      if (filterTarget && !r.target.includes(filterTarget) && !r.targetDetail.includes(filterTarget))
        return false
      if (filterRisk && r.riskLevel !== filterRisk) return false
      if (
        searchKeyword &&
        !r.actor.includes(searchKeyword) &&
        !r.target.includes(searchKeyword) &&
        !r.targetDetail.includes(searchKeyword) &&
        !r.ip.includes(searchKeyword)
      )
        return false
      return true
    })
  }, [filterType, filterActor, filterTarget, filterRisk, searchKeyword])

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE)
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Stats
  const stats = useMemo(() => {
    const total = filteredRecords.length
    const highRisk = filteredRecords.filter((r) => r.riskLevel === 'high').length
    const todayCount = filteredRecords.filter((r) => r.time.startsWith('2026-05-20')).length
    const typeCount = new Set(filteredRecords.map((r) => r.type)).size
    return { total, highRisk, todayCount, typeCount }
  }, [filteredRecords])

  // Actions
  function openDrawer(record: AuditRecord) {
    setSelectedRecord(record)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
  }

  function handleExport() {
    addToast({
      type: 'success',
      title: '导出成功',
      message: `已导出 ${filteredRecords.length} 条审计记录（CSV 格式）`,
    })
  }

  function handleExportJSON() {
    addToast({
      type: 'success',
      title: '导出成功',
      message: `已导出 ${filteredRecords.length} 条审计记录（JSON 格式）`,
    })
  }

  function handleCopyDiff(record: AuditRecord) {
    const text = `【变更前】\n${record.before}\n\n【变更后】\n${record.after}`
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: '复制成功', message: 'Diff 内容已复制到剪贴板' })
  }

  function resetFilters() {
    setFilterType('')
    setFilterActor('')
    setFilterTarget('')
    setFilterTimeRange('30d')
    setFilterRisk('')
    setSearchKeyword('')
    setCurrentPage(1)
  }

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="操作审计日志"
        subtitle="记录系统管理员与租户管理员的安全变更操作，合规审计留存 365 天。"
        breadcrumbs={[{ label: '监控与合规' }, { label: '操作审计' }]}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <Clock size={14} className="text-secondary" />
              <span className="text-secondary">留存期:</span>
              <span className="font-bold text-brand-main">365 天</span>
            </div>
            <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />}>
              刷新
            </Button>
            <Button variant="primary" size="sm" icon={<Download size={16} />} onClick={handleExport}>
              导出审计包
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-secondary" />
            <span className="text-xs text-secondary">总记录数</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-brand-accent" />
            <span className="text-xs text-secondary">高风险操作</span>
          </div>
          <div className="text-2xl font-bold text-brand-accent">{stats.highRisk}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-brand-main" />
            <span className="text-xs text-secondary">今日操作</span>
          </div>
          <div className="text-2xl font-bold text-brand-main">{stats.todayCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-secondary" />
            <span className="text-xs text-secondary">操作类型</span>
          </div>
          <div className="text-2xl font-bold">{stats.typeCount}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-secondary" />
          <span className="text-sm font-bold">筛选条件</span>
          {(filterType || filterActor || filterTarget || filterRisk || searchKeyword) && (
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-brand-main hover:underline"
            >
              重置筛选
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest">
              操作类型
            </label>
            <select
              className="input w-full"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setCurrentPage(1)
              }}
            >
              {AUDIT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest">
              操作人
            </label>
            <Input
              placeholder="用户名或角色"
              icon={<User size={16} />}
              value={filterActor}
              onChange={(e) => {
                setFilterActor(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest">
              目标对象
            </label>
            <Input
              placeholder="对象名称或路径"
              icon={<Target size={16} />}
              value={filterTarget}
              onChange={(e) => {
                setFilterTarget(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest">
              风险等级
            </label>
            <select
              className="input w-full"
              value={filterRisk}
              onChange={(e) => {
                setFilterRisk(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">全部等级</option>
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high">高风险</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest">
              时间范围
            </label>
            <select
              className="input w-full"
              value={filterTimeRange}
              onChange={(e) => {
                setFilterTimeRange(e.target.value)
                setCurrentPage(1)
              }}
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest">
              关键词搜索
            </label>
            <Input
              placeholder="搜索 IP、对象名、路径..."
              icon={<Search size={16} />}
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>
      </Card>

      {/* Audit Table */}
      <Card className="p-0 overflow-hidden">
        {/* Table Header Actions */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-secondary">共</span>
            <span className="font-bold text-brand-main">{filteredRecords.length}</span>
            <span className="text-secondary">条记录</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportJSON}>
              导出 JSON
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
              导出 CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="border-b text-xs text-secondary uppercase tracking-wider"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <tr>
                <th className="p-4">时间</th>
                <th className="p-4">操作人</th>
                <th className="p-4">操作类型</th>
                <th className="p-4">目标对象</th>
                <th className="p-4">风险等级</th>
                <th className="p-4">源 IP</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={FileText}
                      title="暂无审计记录"
                      description="没有匹配当前筛选条件的审计日志"
                      action={{ label: '重置筛选', onClick: resetFilters }}
                    />
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const typeConfig = AUDIT_TYPE_CONFIG[record.type]
                  const riskConfig = RISK_LEVEL_CONFIG[record.riskLevel]
                  const TypeIcon = typeConfig.icon
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-elevated transition-colors cursor-pointer"
                      onClick={() => openDrawer(record)}
                    >
                      <td className="p-4">
                        <div className="text-secondary text-xs font-mono">{record.time}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{record.actor}</div>
                        <div className="text-xs text-secondary">{record.actorRole}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <TypeIcon size={14} className="text-secondary" />
                          <Badge variant={typeConfig.badgeVariant}>{record.typeLabel}</Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{record.target}</div>
                        <div className="text-xs text-secondary truncate max-w-[200px]">
                          {record.targetDetail}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={riskConfig.variant}>{riskConfig.label}</Badge>
                      </td>
                      <td className="p-4 font-mono text-xs text-secondary">{record.ip}</td>
                      <td className="p-4 text-right">
                        <button
                          className="text-brand-main font-bold text-xs hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDrawer(record)
                          }}
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="p-4 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="text-xs text-secondary">
              第 {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
              {Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} 条，共{' '}
              {filteredRecords.length} 条
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronLeft size={14} />}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                      page === currentPage
                        ? 'bg-brand-main text-white'
                        : 'hover:bg-elevated text-secondary'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronRight size={14} />}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title="审计日志详情"
        description="AUDIT DETAIL"
        width="md"
      >
        {selectedRecord && (
          <div className="space-y-5 text-sm">
            {/* Risk Level Banner */}
            <div
              className="p-3 rounded-lg flex items-center gap-2"
              style={{
                backgroundColor: selectedRecord.riskLevel === 'high'
                  ? 'color-mix(in srgb, var(--error) 10%, transparent)'
                  : selectedRecord.riskLevel === 'medium'
                  ? 'color-mix(in srgb, var(--warning) 10%, transparent)'
                  : 'color-mix(in srgb, var(--success) 10%, transparent)',
                color: selectedRecord.riskLevel === 'high'
                  ? 'var(--error)'
                  : selectedRecord.riskLevel === 'medium'
                  ? 'var(--warning)'
                  : 'var(--success)',
                border: `1px solid ${selectedRecord.riskLevel === 'high'
                  ? 'color-mix(in srgb, var(--error) 20%, transparent)'
                  : selectedRecord.riskLevel === 'medium'
                  ? 'color-mix(in srgb, var(--warning) 20%, transparent)'
                  : 'color-mix(in srgb, var(--success) 20%, transparent)'}`,
              }}
            >
              <AlertTriangle size={16} />
              <span className="font-bold">
                {RISK_LEVEL_CONFIG[selectedRecord.riskLevel].label}
              </span>
              <span className="text-xs opacity-80">
                {selectedRecord.riskLevel === 'high'
                  ? '此操作涉及权限提升或系统配置变更，请仔细核查'
                  : selectedRecord.riskLevel === 'medium'
                  ? '此操作涉及资源配额或批量变更，请关注'
                  : '此操作为常规变更，风险可控'}
              </span>
            </div>

            {/* Meta info grid */}
            <Card>
              <h4 className="font-bold mb-3">基本信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Clock size={12} /> 操作时间
                  </div>
                  <div className="font-mono text-sm">{selectedRecord.time}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Globe size={12} /> 源 IP 地址
                  </div>
                  <div className="font-mono text-sm">{selectedRecord.ip}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                    <User size={12} /> 操作人
                  </div>
                  <div className="font-bold">{selectedRecord.actor}</div>
                  <div className="text-xs text-secondary">{selectedRecord.actorRole}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                    <FileText size={12} /> 操作类型
                  </div>
                  <Badge variant={AUDIT_TYPE_CONFIG[selectedRecord.type].badgeVariant}>
                    {selectedRecord.typeLabel}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Target */}
            <Card>
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Target size={16} /> 变更对象
              </h4>
              <div
                className="p-3 border rounded-lg font-bold"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                {selectedRecord.target}
              </div>
              <div className="mt-2 text-xs text-secondary">{selectedRecord.targetDetail}</div>
            </Card>

            {/* Diff view */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">操作前后 Diff 差异</h4>
                <button
                  onClick={() => handleCopyDiff(selectedRecord)}
                  className="text-xs text-brand-main hover:underline flex items-center gap-1"
                >
                  <Copy size={12} /> 复制 Diff
                </button>
              </div>
              <div
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div
                  className="flex border-b text-xs font-bold"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <div
                    className="w-1/2 p-2 border-r flex items-center gap-1"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--error)' }} />
                    变更前 (Before)
                  </div>
                  <div className="w-1/2 p-2 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
                    变更后 (After)
                  </div>
                </div>
                <div className="flex font-mono text-xs h-48">
                  <div
                    className="w-1/2 p-3 bg-red-500/5 border-r overflow-y-auto whitespace-pre leading-relaxed"
                    style={{
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {renderDiffLines(selectedRecord.before, 'before')}
                  </div>
                  <div className="w-1/2 p-3 bg-green-500/5 overflow-y-auto whitespace-pre leading-relaxed">
                    {renderDiffLines(selectedRecord.after, 'after')}
                  </div>
                </div>
              </div>
            </Card>

            {/* Compliance notice */}
            <div
              className="p-4 text-xs rounded-lg border leading-relaxed flex items-start gap-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-main) 8%, var(--bg-surface))',
                borderColor: 'color-mix(in srgb, var(--brand-main) 20%, var(--bg-surface))',
                color: 'var(--brand-main)',
              }}
            >
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderDiffLines(content: string, _side: 'before' | 'after') {
  if (content.startsWith('(无变更前状态)')) {
    return (
      <span className="italic opacity-60">{content}</span>
    )
  }

  return content.split('\n').map((line, i) => {
    const isKey = line.includes('"')
    return (
      <div key={i} className="flex">
        <span className="inline-block w-6 text-right mr-2 opacity-40 select-none">
          {i + 1}
        </span>
        <span>
          {isKey ? highlightJsonLine(line) : line}
        </span>
      </div>
    )
  })
}

function highlightJsonLine(line: string) {
  // Simple JSON key-value highlighting
  const match = line.match(/^(\s*"?)([^"]+)("?\s*:\s*)(.*)/)
  if (match) {
    const [, prefix, key, sep, value] = match
    return (
      <>
        <span className="opacity-60">{prefix}</span>
        <span className="text-brand-accent">{key}</span>
        <span className="opacity-60">{sep}</span>
        <span className="text-brand-main">{value}</span>
      </>
    )
  }
  return line
}
