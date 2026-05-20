import { useState, useMemo } from 'react'
import {
  Plus,
  Shield,
  FileText,
  Search,
  X,
  Eye,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Filter,
  Code2,
  Settings,
  TestTube2,
  ShieldCheck,
  Copy,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Drawer } from '@/components/ui/Drawer'
import { Stepper } from '@/components/ui/Stepper'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useUIStore } from '@/stores/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type HookTrigger = 'before' | 'after' | 'error' | 'abort'
type HookStatus = 'enabled' | 'disabled' | 'draft'
type ReviewStatus = 'approved' | 'pending' | 'rejected' | 'not_submitted'

interface Hook {
  id: string
  name: string
  trigger: HookTrigger
  description: string
  scope: string
  status: HookStatus
  reviewStatus: ReviewStatus
  language: string
  timeout: number
  code: string
  calls7d: number
  avgLatency: number
  errorRate: number
  lastRun: string
  createdBy: string
  createdAt: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRIGGER_CONFIG: Record<HookTrigger, { label: string; color: string; badgeVariant: 'success' | 'warning' | 'error' | 'info' }> = {
  before: { label: 'before', color: 'var(--info)', badgeVariant: 'info' },
  after: { label: 'after', color: 'var(--success)', badgeVariant: 'success' },
  error: { label: 'error', color: 'var(--error)', badgeVariant: 'error' },
  abort: { label: 'abort', color: 'var(--warning)', badgeVariant: 'warning' },
}

const STATUS_CONFIG: Record<HookStatus, { label: string; badgeVariant: 'success' | 'warning' | 'neutral' }> = {
  enabled: { label: '已启用', badgeVariant: 'success' },
  disabled: { label: '已停用', badgeVariant: 'warning' },
  draft: { label: '草稿', badgeVariant: 'neutral' },
}

const REVIEW_CONFIG: Record<ReviewStatus, { label: string; icon: React.ReactNode; color: string }> = {
  approved: { label: '已通过', icon: <CheckCircle2 size={14} />, color: 'var(--success)' },
  pending: { label: '待审批', icon: <Clock size={14} />, color: 'var(--warning)' },
  rejected: { label: '已拒绝', icon: <XCircle size={14} />, color: 'var(--error)' },
  not_submitted: { label: '未提交', icon: <AlertTriangle size={14} />, color: 'var(--text-secondary)' },
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_HOOKS: Hook[] = [
  {
    id: '1',
    name: '敏感词过滤',
    trigger: 'before',
    description: '检测 prompt 中的敏感关键词，命中则拒绝请求并返回告警信息。',
    scope: '全局',
    status: 'enabled',
    reviewStatus: 'approved',
    language: 'JavaScript',
    timeout: 5000,
    code: `export default async function beforeRequest(ctx) {\n  const sensitiveWords = ['密码', 'token', 'secret'];\n  const prompt = ctx.body.messages?.[0]?.content || '';\n  \n  for (const word of sensitiveWords) {\n    if (prompt.includes(word)) {\n      return ctx.reject(403, \`检测到敏感词: \${word}\`);\n    }\n  }\n  \n  return ctx.next();\n}`,
    calls7d: 12480,
    avgLatency: 8,
    errorRate: 0.3,
    lastRun: '3 分钟前',
    createdBy: '张明',
    createdAt: '2026-03-15',
  },
  {
    id: '2',
    name: '请求日志增强',
    trigger: 'after',
    description: '将每次调用的完整 prompt + response 写入审计库，支持溯源查询。',
    scope: '全局',
    status: 'enabled',
    reviewStatus: 'approved',
    language: 'JavaScript',
    timeout: 10000,
    code: `export default async function afterResponse(ctx) {\n  await ctx.audit.log({\n    requestId: ctx.requestId,\n    prompt: ctx.body.messages,\n    response: ctx.response.choices,\n    model: ctx.body.model,\n    usage: ctx.response.usage,\n    timestamp: Date.now(),\n  });\n  \n  return ctx.next();\n}`,
    calls7d: 12480,
    avgLatency: 15,
    errorRate: 0.1,
    lastRun: '3 分钟前',
    createdBy: '张明',
    createdAt: '2026-03-15',
  },
  {
    id: '3',
    name: '系统提示词注入',
    trigger: 'before',
    description: '自动在 system message 中注入企业安全合规声明，确保每次对话均包含合规条款。',
    scope: '研发中心',
    status: 'disabled',
    reviewStatus: 'approved',
    language: 'JavaScript',
    timeout: 3000,
    code: `export default async function beforeRequest(ctx) {\n  const compliance = '你是一个企业AI助手，必须遵守信息安全规定...';\n  \n  if (ctx.body.messages) {\n    ctx.body.messages.unshift({\n      role: 'system',\n      content: compliance,\n    });\n  }\n  \n  return ctx.next();\n}`,
    calls7d: 0,
    avgLatency: 0,
    errorRate: 0,
    lastRun: '7 天前',
    createdBy: '李婷',
    createdAt: '2026-03-20',
  },
  {
    id: '4',
    name: '响应格式化',
    trigger: 'after',
    description: '将 Markdown 格式输出转为纯文本返回给特定 Key，兼容旧系统接入。',
    scope: 'ag-prod-c3d4',
    status: 'enabled',
    reviewStatus: 'approved',
    language: 'JavaScript',
    timeout: 3000,
    code: `export default async function afterResponse(ctx) {\n  if (ctx.response.choices) {\n    for (const choice of ctx.response.choices) {\n      choice.message.content = stripMarkdown(\n        choice.message.content\n      );\n    }\n  }\n  return ctx.next();\n}`,
    calls7d: 890,
    avgLatency: 5,
    errorRate: 0.2,
    lastRun: '12 分钟前',
    createdBy: '王刚',
    createdAt: '2026-04-02',
  },
  {
    id: '5',
    name: '超时熔断降级',
    trigger: 'error',
    description: '当上游模型响应超时时，自动切换到备用渠道或返回缓存结果。',
    scope: '全局',
    status: 'enabled',
    reviewStatus: 'approved',
    language: 'JavaScript',
    timeout: 2000,
    code: `export default async function onError(ctx, error) {\n  if (error.code === 'TIMEOUT') {\n    const fallback = ctx.getFallbackChannel();\n    if (fallback) {\n      return ctx.retry(fallback);\n    }\n  }\n  \n  return ctx.abort(504, '服务暂时不可用');\n}`,
    calls7d: 34,
    avgLatency: 120,
    errorRate: 5.9,
    lastRun: '2 小时前',
    createdBy: '张明',
    createdAt: '2026-04-10',
  },
  {
    id: '6',
    name: 'Token 用量校验',
    trigger: 'before',
    description: '在请求发出前校验剩余配额，若不足则拦截请求并提示用户申请额度。',
    scope: '全局',
    status: 'enabled',
    reviewStatus: 'pending',
    language: 'TypeScript',
    timeout: 2000,
    code: `export default async function beforeRequest(ctx) {\n  const quota = await ctx.quota.getRemaining(ctx.apiKey);\n  const estimated = estimateTokens(ctx.body);\n  \n  if (quota.remaining < estimated) {\n    return ctx.reject(429, {\n      message: '配额不足',\n      remaining: quota.remaining,\n      estimated,\n    });\n  }\n  \n  return ctx.next();\n}`,
    calls7d: 12480,
    avgLatency: 12,
    errorRate: 2.1,
    lastRun: '1 分钟前',
    createdBy: '赵强',
    createdAt: '2026-04-18',
  },
  {
    id: '7',
    name: '请求体大小限制',
    trigger: 'abort',
    description: '当请求体超过 100KB 时直接中止，防止恶意超大 payload 耗尽资源。',
    scope: '全局',
    status: 'enabled',
    reviewStatus: 'approved',
    language: 'JavaScript',
    timeout: 1000,
    code: `export default async function onAbort(ctx) {\n  const size = JSON.stringify(ctx.body).length;\n  const limit = 100 * 1024; // 100KB\n  \n  if (size > limit) {\n    return ctx.abort(413, {\n      message: '请求体过大',\n      size,\n      limit,\n    });\n  }\n  \n  return ctx.next();\n}`,
    calls7d: 12480,
    avgLatency: 2,
    errorRate: 0.05,
    lastRun: '1 分钟前',
    createdBy: '张明',
    createdAt: '2026-05-01',
  },
  {
    id: '8',
    name: '调试模式日志',
    trigger: 'after',
    description: '仅在 debug key 下启用的详细日志记录，输出完整 request/response 到控制台。',
    scope: 'ag-dev-debug',
    status: 'draft',
    reviewStatus: 'not_submitted',
    language: 'JavaScript',
    timeout: 1000,
    code: `export default async function afterResponse(ctx) {\n  console.log('[DEBUG]', {\n    requestId: ctx.requestId,\n    model: ctx.body.model,\n    latency: ctx.metrics.latency,\n    tokens: ctx.response.usage,\n  });\n  return ctx.next();\n}`,
    calls7d: 0,
    avgLatency: 0,
    errorRate: 0,
    lastRun: '-',
    createdBy: '王刚',
    createdAt: '2026-05-18',
  },
]

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const HOOK_TABS = [
  { id: 'all', label: '全部', count: MOCK_HOOKS.length },
  { id: 'before', label: 'before', count: MOCK_HOOKS.filter((h) => h.trigger === 'before').length },
  { id: 'after', label: 'after', count: MOCK_HOOKS.filter((h) => h.trigger === 'after').length },
  { id: 'error', label: 'error', count: MOCK_HOOKS.filter((h) => h.trigger === 'error').length },
  { id: 'abort', label: 'abort', count: MOCK_HOOKS.filter((h) => h.trigger === 'abort').length },
]

/* ------------------------------------------------------------------ */
/*  Wizard Steps                                                       */
/* ------------------------------------------------------------------ */

const WIZARD_STEPS = [
  { id: 'basic', title: '基本信息', description: '名称与触发点' },
  { id: 'code', title: '编写代码', description: 'Hook 逻辑' },
  { id: 'config', title: '配置参数', description: '超时与降级' },
  { id: 'review', title: '安全审查', description: '提交审批' },
]

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

function computeStats(hooks: Hook[]) {
  const enabled = hooks.filter((h) => h.status === 'enabled')
  return {
    total: hooks.length,
    enabled: enabled.length,
    totalCalls7d: hooks.reduce((s, h) => s + h.calls7d, 0),
    avgLatency: enabled.length > 0
      ? Math.round(enabled.filter((h) => h.calls7d > 0).reduce((s, h) => s + h.avgLatency, 0) / Math.max(enabled.filter((h) => h.calls7d > 0).length, 1))
      : 0,
    pendingReview: hooks.filter((h) => h.reviewStatus === 'pending').length,
    errorHooks: hooks.filter((h) => h.trigger === 'error').length,
  }
}

/* ------------------------------------------------------------------ */
/*  Code Preview                                                       */
/* ------------------------------------------------------------------ */

function CodeBlock({ code, language }: { code: string; language: string }) {
  const { addToast } = useUIStore()

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    addToast({ type: 'success', title: '已复制代码' })
  }

  return (
    <div className="relative">
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-lg text-xs"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}
      >
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors"
        >
          <Copy size={12} />
          复制
        </button>
      </div>
      <pre
        className="p-4 rounded-b-lg overflow-x-auto text-xs leading-relaxed"
        style={{
          background: 'var(--bg-body)',
          color: 'var(--text-primary)',
          fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Hooks() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [reviewFilter, setReviewFilter] = useState<string>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedHook, setSelectedHook] = useState<Hook | null>(null)
  const [drawerTab, setDrawerTab] = useState<'code' | 'config' | 'test' | 'audit'>('code')
  const [confirmAction, setConfirmAction] = useState<{ type: string; hookName?: string } | null>(null)

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardName, setWizardName] = useState('')
  const [wizardTrigger, setWizardTrigger] = useState<HookTrigger>('before')
  const [wizardDesc, setWizardDesc] = useState('')
  const [wizardScope, setWizardScope] = useState('全局')
  const [wizardLanguage, setWizardLanguage] = useState('JavaScript')
  const [wizardCode, setWizardCode] = useState('')
  const [wizardTimeout, setWizardTimeout] = useState(5000)

  // Test state
  const [testInput, setTestInput] = useState('{"messages": [{"role": "user", "content": "你好"}]}')
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const { addToast } = useUIStore()

  const stats = useMemo(() => computeStats(MOCK_HOOKS), [])

  const filteredHooks = useMemo(() => {
    return MOCK_HOOKS.filter((hook) => {
      const matchesTab = activeTab === 'all' || hook.trigger === activeTab
      const matchesSearch = !search || hook.name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || hook.status === statusFilter
      const matchesReview = reviewFilter === 'all' || hook.reviewStatus === reviewFilter
      return matchesTab && matchesSearch && matchesStatus && matchesReview
    })
  }, [activeTab, search, statusFilter, reviewFilter])

  const hasActiveFilters = statusFilter !== 'all' || reviewFilter !== 'all' || search !== ''

  const clearFilters = () => {
    setStatusFilter('all')
    setReviewFilter('all')
    setSearch('')
  }

  const openDrawer = (hook: Hook) => {
    setSelectedHook(hook)
    setDrawerTab('code')
    setTestResult(null)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelectedHook(null)
    setTestResult(null)
  }

  const openWizard = () => {
    setWizardStep(0)
    setWizardName('')
    setWizardTrigger('before')
    setWizardDesc('')
    setWizardScope('全局')
    setWizardLanguage('JavaScript')
    setWizardCode('')
    setWizardTimeout(5000)
    setWizardOpen(true)
  }

  const handleWizardNext = () => {
    if (wizardStep === 0 && !wizardName.trim()) {
      addToast({ type: 'warning', title: '请输入 Hook 名称' })
      return
    }
    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep(wizardStep + 1)
    }
  }

  const handleWizardPrev = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1)
    }
  }

  const handleWizardSubmit = () => {
    addToast({
      type: 'success',
      title: 'Hook 创建成功',
      message: `「${wizardName}」已提交安全审查，审批通过后将自动生效。`,
    })
    setWizardOpen(false)
  }

  const handleTestRun = () => {
    setTestRunning(true)
    setTestResult(null)
    setTimeout(() => {
      setTestRunning(false)
      setTestResult(
        JSON.stringify(
          {
            status: 'success',
            message: 'Hook 执行通过',
            latency: '12ms',
            output: { allowed: true, modified: false },
          },
          null,
          2
        )
      )
    }, 1500)
  }

  const handleToggleStatus = (hook: Hook) => {
    const newStatus = hook.status === 'enabled' ? 'disabled' : 'enabled'
    addToast({
      type: 'success',
      title: newStatus === 'enabled' ? '已启用' : '已停用',
      message: `Hook「${hook.name}」已${newStatus === 'enabled' ? '启用' : '停用'}`,
    })
  }

  const handleSubmitReview = (hook: Hook) => {
    addToast({
      type: 'success',
      title: '已提交安全审查',
      message: `Hook「${hook.name}」已提交 IT 管理员审批。`,
    })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'delete') {
      addToast({ type: 'success', title: '已删除', message: `Hook「${confirmAction.hookName}」已删除` })
      closeDrawer()
    }
    setConfirmAction(null)
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      <PageHeader
        title="Hooks 钩子库"
        subtitle="在 AI 调用生命周期中插入自定义代码逻辑（before / after / error / abort），仅限 IT 管理员操作。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'Hooks 钩子' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={openWizard}>
            创建 Hook
          </Button>
        }
      />

      {/* Stats KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
            >
              <Zap size={18} />
            </div>
            <span className="text-xs text-secondary">钩子总数</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-secondary mt-1">
            <span style={{ color: 'var(--brand-main)' }}>{stats.enabled}</span> 已启用
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
            >
              <Activity size={18} />
            </div>
            <span className="text-xs text-secondary">近 7 天执行次数</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalCalls7d.toLocaleString()}</div>
          <div className="text-xs text-secondary mt-1">平均延迟 {stats.avgLatency}ms</div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--warning)' }}
            >
              <Clock size={18} />
            </div>
            <span className="text-xs text-secondary">待安全审查</span>
          </div>
          <div className="text-2xl font-bold">{stats.pendingReview}</div>
          <div className="text-xs text-secondary mt-1">需 IT 管理员审批</div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--brand-accent)' }}
            >
              <Shield size={18} />
            </div>
            <span className="text-xs text-secondary">错误处理钩子</span>
          </div>
          <div className="text-2xl font-bold">{stats.errorHooks}</div>
          <div className="text-xs text-secondary mt-1">error + abort 类型</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={HOOK_TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Search & Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="搜索 Hook 名称..."
            icon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />

          <select
            className="input text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: 130 }}
          >
            <option value="all">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已停用</option>
            <option value="draft">草稿</option>
          </select>

          <select
            className="input text-sm"
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            style={{ minWidth: 130 }}
          >
            <option value="all">全部审查状态</option>
            <option value="approved">已通过</option>
            <option value="pending">待审批</option>
            <option value="rejected">已拒绝</option>
            <option value="not_submitted">未提交</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer"
              style={{ color: 'var(--brand-main)', background: 'var(--bg-elevated)' }}
            >
              <X size={12} />
              清除筛选
            </button>
          )}

          <span className="text-xs text-secondary ml-auto">
            共 <strong style={{ color: 'var(--text-primary)' }}>{filteredHooks.length}</strong> 个钩子
          </span>
        </div>
      </div>

      {/* Hook Table */}
      {filteredHooks.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="暂无匹配的 Hook"
          description={hasActiveFilters ? '没有符合筛选条件的钩子，请调整筛选项' : '还没有创建任何 Hook 钩子'}
          action={
            hasActiveFilters
              ? { label: '清除筛选', onClick: clearFilters }
              : { label: '创建 Hook', onClick: openWizard }
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead
                className="border-b text-xs uppercase tracking-wider"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                }}
              >
                <tr>
                  <th className="p-4">Hook 名称</th>
                  <th className="p-4">触发点</th>
                  <th className="p-4">描述</th>
                  <th className="p-4">作用范围</th>
                  <th className="p-4">安全审查</th>
                  <th className="p-4">状态</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm" style={{ borderColor: 'var(--border-color)' }}>
                {filteredHooks.map((hook) => {
                  const triggerConf = TRIGGER_CONFIG[hook.trigger]
                  const statusConf = STATUS_CONFIG[hook.status]
                  const reviewConf = REVIEW_CONFIG[hook.reviewStatus]

                  return (
                    <tr
                      key={hook.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      onClick={() => openDrawer(hook)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--brand-main)',
                            }}
                          >
                            {getHookIcon(hook.trigger)}
                          </div>
                          <div>
                            <span className="font-bold">{hook.name}</span>
                            <div className="text-xs text-secondary mt-0.5">{hook.language}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={triggerConf.badgeVariant}>{triggerConf.label}</Badge>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                          {hook.description}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {hook.scope}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-flex items-center gap-1 text-xs"
                          style={{ color: reviewConf.color }}
                        >
                          {reviewConf.icon}
                          {reviewConf.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusConf.badgeVariant}>{statusConf.label}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="p-1.5 rounded-lg hover:bg-elevated transition-colors cursor-pointer"
                            title="查看详情"
                            onClick={() => openDrawer(hook)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-elevated transition-colors cursor-pointer"
                            title={hook.status === 'enabled' ? '停用' : '启用'}
                            onClick={() => handleToggleStatus(hook)}
                          >
                            {hook.status === 'enabled' ? (
                              <XCircle size={14} style={{ color: 'var(--brand-accent)' }} />
                            ) : (
                              <CheckCircle2 size={14} style={{ color: 'var(--brand-main)' }} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/*  Detail Drawer                                                */}
      {/* ============================================================ */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={selectedHook?.name || ''}
        description={selectedHook?.description}
        width="lg"
      >
        {selectedHook && (
          <div className="space-y-6">
            {/* Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-secondary mb-1">触发点</div>
                <Badge variant={TRIGGER_CONFIG[selectedHook.trigger].badgeVariant}>
                  {selectedHook.trigger}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-secondary mb-1">状态</div>
                <Badge variant={STATUS_CONFIG[selectedHook.status].badgeVariant}>
                  {STATUS_CONFIG[selectedHook.status].label}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-secondary mb-1">安全审查</div>
                <span
                  className="inline-flex items-center gap-1 text-xs"
                  style={{ color: REVIEW_CONFIG[selectedHook.reviewStatus].color }}
                >
                  {REVIEW_CONFIG[selectedHook.reviewStatus].icon}
                  {REVIEW_CONFIG[selectedHook.reviewStatus].label}
                </span>
              </div>
              <div>
                <div className="text-xs text-secondary mb-1">作用范围</div>
                <span className="text-sm font-medium">{selectedHook.scope}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className="text-xs text-secondary mb-1">近 7 天调用</div>
                <div className="text-lg font-bold">{selectedHook.calls7d.toLocaleString()}</div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className="text-xs text-secondary mb-1">平均延迟</div>
                <div className="text-lg font-bold">{selectedHook.avgLatency}ms</div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className="text-xs text-secondary mb-1">错误率</div>
                <div
                  className="text-lg font-bold"
                  style={{
                    color: selectedHook.errorRate > 3 ? 'var(--error)' : selectedHook.errorRate > 1 ? 'var(--warning)' : 'var(--text-primary)',
                  }}
                >
                  {selectedHook.errorRate}%
                </div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className="text-xs text-secondary mb-1">最后执行</div>
                <div className="text-sm font-medium">{selectedHook.lastRun}</div>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div
              className="flex gap-1 p-1 rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}
            >
              {[
                { id: 'code' as const, label: '代码', icon: <Code2 size={14} /> },
                { id: 'config' as const, label: '配置', icon: <Settings size={14} /> },
                { id: 'test' as const, label: '测试', icon: <TestTube2 size={14} /> },
                { id: 'audit' as const, label: '审查记录', icon: <ShieldCheck size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all"
                  style={{
                    background: drawerTab === tab.id ? 'var(--bg-surface)' : undefined,
                    color: drawerTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Tab */}
            {drawerTab === 'code' && (
              <div>
                <CodeBlock code={selectedHook.code} language={selectedHook.language} />
                <div className="flex items-center gap-2 mt-3 text-xs text-secondary">
                  <Clock size={12} />
                  <span>超时限制: {selectedHook.timeout}ms</span>
                  <span className="mx-1">|</span>
                  <span>创建者: {selectedHook.createdBy}</span>
                  <span className="mx-1">|</span>
                  <span>创建于: {selectedHook.createdAt}</span>
                </div>
              </div>
            )}

            {/* Config Tab */}
            {drawerTab === 'config' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      超时时间 (ms)
                    </label>
                    <Input type="number" value={selectedHook.timeout} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      语言
                    </label>
                    <Input value={selectedHook.language} readOnly />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    作用范围
                  </label>
                  <select className="input" defaultValue={selectedHook.scope}>
                    <option>全局</option>
                    <option>指定租户</option>
                    <option>指定项目</option>
                    <option>指定密钥</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    降级策略
                  </label>
                  <select className="input">
                    <option>跳过钩子，继续请求</option>
                    <option>拒绝请求，返回 503</option>
                    <option>返回缓存结果</option>
                    <option>切换备用渠道</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    重试策略
                  </label>
                  <select className="input">
                    <option>不重试</option>
                    <option>最多重试 1 次</option>
                    <option>最多重试 3 次（指数退避）</option>
                  </select>
                </div>
              </div>
            )}

            {/* Test Tab */}
            {drawerTab === 'test' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    测试输入 (JSON)
                  </label>
                  <textarea
                    className="input h-32 font-mono text-xs"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder='{"messages": [{"role": "user", "content": "你好"}]}'
                    style={{ fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace' }}
                  />
                </div>
                <Button
                  variant="primary"
                  icon={testRunning ? undefined : <Play size={14} />}
                  loading={testRunning}
                  onClick={handleTestRun}
                >
                  {testRunning ? '执行中...' : '运行测试'}
                </Button>
                {testResult && (
                  <div>
                    <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      测试结果
                    </div>
                    <pre
                      className="p-4 rounded-lg text-xs overflow-x-auto"
                      style={{
                        background: 'var(--bg-body)',
                        color: 'var(--success)',
                        fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {testResult}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Audit Tab */}
            {drawerTab === 'audit' && (
              <div className="space-y-4">
                {/* Review Status Card */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} style={{ color: REVIEW_CONFIG[selectedHook.reviewStatus].color }} />
                      <span className="font-medium text-sm">安全审查状态</span>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-medium"
                      style={{ color: REVIEW_CONFIG[selectedHook.reviewStatus].color }}
                    >
                      {REVIEW_CONFIG[selectedHook.reviewStatus].icon}
                      {REVIEW_CONFIG[selectedHook.reviewStatus].label}
                    </span>
                  </div>
                  <div className="text-xs text-secondary">
                    {selectedHook.reviewStatus === 'approved'
                      ? '该 Hook 已通过 IT 管理员安全审查，代码中无危险操作，可在线上环境运行。'
                      : selectedHook.reviewStatus === 'pending'
                        ? '该 Hook 正在等待 IT 管理员进行安全审查，审查内容包括：代码安全扫描、权限校验、沙箱隔离验证。'
                        : selectedHook.reviewStatus === 'rejected'
                          ? '该 Hook 未通过安全审查，请根据审查意见修改后重新提交。'
                          : '该 Hook 尚未提交安全审查，草稿状态的 Hook 无法在线上环境生效。'}
                  </div>
                </div>

                {/* Review Timeline */}
                <div className="space-y-0">
                  {[
                    { time: selectedHook.createdAt, action: `${selectedHook.createdBy} 创建了 Hook`, icon: <FileText size={14} /> },
                    ...(selectedHook.reviewStatus !== 'not_submitted'
                      ? [{ time: '2026-05-10', action: '提交安全审查', icon: <ShieldCheck size={14} /> }]
                      : []),
                    ...(selectedHook.reviewStatus === 'approved'
                      ? [{ time: '2026-05-12', action: 'IT 管理员审批通过', icon: <CheckCircle2 size={14} /> }]
                      : selectedHook.reviewStatus === 'rejected'
                        ? [{ time: '2026-05-12', action: 'IT 管理员审批拒绝', icon: <XCircle size={14} /> }]
                        : []),
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 py-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{item.action}</div>
                        <div className="text-xs text-secondary mt-0.5">{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                {selectedHook.reviewStatus === 'not_submitted' && (
                  <Button
                    variant="primary"
                    icon={<ShieldCheck size={14} />}
                    onClick={() => handleSubmitReview(selectedHook)}
                    className="w-full"
                  >
                    提交安全审查
                  </Button>
                )}
                {selectedHook.reviewStatus === 'rejected' && (
                  <Button
                    variant="primary"
                    icon={<ArrowRight size={14} />}
                    onClick={() => handleSubmitReview(selectedHook)}
                    className="w-full"
                  >
                    重新提交审查
                  </Button>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div
              className="flex items-center justify-between pt-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setConfirmAction({ type: 'delete', hookName: selectedHook.name })}
              >
                删除
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={closeDrawer}>
                  关闭
                </Button>
                <Button
                  variant={selectedHook.status === 'enabled' ? 'secondary' : 'primary'}
                  icon={selectedHook.status === 'enabled' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                  onClick={() => {
                    handleToggleStatus(selectedHook)
                    closeDrawer()
                  }}
                >
                  {selectedHook.status === 'enabled' ? '停用' : '启用'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'delete' ? '确认删除 Hook' : '确认操作'}
        description={confirmAction?.type === 'delete' ? `删除后 Hook「${confirmAction.hookName}」的所有配置和代码将被清除，此操作不可逆。` : undefined}
        confirmText={confirmAction?.type === 'delete' ? '删除' : '确认'}
        variant="danger"
      />

      {/* ============================================================ */}
      {/*  Create Wizard Modal                                          */}
      {/* ============================================================ */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setWizardOpen(false)} />
          <div
            className="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between pb-4 mb-6 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <h2 className="text-lg font-semibold">创建 Hook</h2>
                <p className="text-sm text-secondary mt-1">
                  按步骤配置钩子的基本信息、代码逻辑和安全参数。
                </p>
              </div>
              <button
                onClick={() => setWizardOpen(false)}
                className="p-1 rounded-lg hover:bg-elevated transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper */}
            <Stepper steps={WIZARD_STEPS} currentStep={wizardStep} className="mb-8" />

            {/* Step Content */}
            <div className="min-h-[280px]">
              {/* Step 0: Basic Info */}
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <Input
                    label="Hook 名称"
                    placeholder="例如：敏感词过滤、Token 用量校验"
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        触发点
                      </label>
                      <select
                        className="input"
                        value={wizardTrigger}
                        onChange={(e) => setWizardTrigger(e.target.value as HookTrigger)}
                      >
                        <option value="before">before - 请求前拦截</option>
                        <option value="after">after - 响应后处理</option>
                        <option value="error">error - 错误时处理</option>
                        <option value="abort">abort - 中止时处理</option>
                      </select>
                    </div>
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        作用范围
                      </label>
                      <select
                        className="input"
                        value={wizardScope}
                        onChange={(e) => setWizardScope(e.target.value)}
                      >
                        <option>全局</option>
                        <option>指定租户</option>
                        <option>指定项目</option>
                        <option>指定密钥</option>
                      </select>
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      描述
                    </label>
                    <textarea
                      className="input h-20"
                      placeholder="描述该 Hook 的处理逻辑和触发条件..."
                      value={wizardDesc}
                      onChange={(e) => setWizardDesc(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 1: Code */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Hook 代码
                    </label>
                    <select
                      className="input text-xs"
                      style={{ width: 'auto' }}
                      value={wizardLanguage}
                      onChange={(e) => setWizardLanguage(e.target.value)}
                    >
                      <option>JavaScript</option>
                      <option>TypeScript</option>
                    </select>
                  </div>
                  <textarea
                    className="input h-64 font-mono text-xs"
                    value={wizardCode}
                    onChange={(e) => setWizardCode(e.target.value)}
                    placeholder={`export default async function ${wizardTrigger}Hook(ctx) {\n  // 在此编写你的处理逻辑\n  return ctx.next();\n}`}
                    style={{ fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace' }}
                  />
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    <strong>提示：</strong>函数接收 ctx 上下文对象，包含 request/response 信息。
                    调用 ctx.next() 继续执行链，调用 ctx.reject() / ctx.abort() 中断请求。
                  </div>
                </div>
              )}

              {/* Step 2: Config */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="超时时间 (ms)"
                      type="number"
                      value={wizardTimeout}
                      onChange={(e) => setWizardTimeout(Number(e.target.value))}
                      helperText="超过此时间将触发降级策略"
                    />
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        降级策略
                      </label>
                      <select className="input">
                        <option>跳过钩子，继续请求</option>
                        <option>拒绝请求，返回 503</option>
                        <option>返回缓存结果</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        重试策略
                      </label>
                      <select className="input">
                        <option>不重试</option>
                        <option>最多重试 1 次</option>
                        <option>最多重试 3 次（指数退避）</option>
                      </select>
                    </div>
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        沙箱策略
                      </label>
                      <select className="input">
                        <option>严格隔离（只读文件系统）</option>
                        <option>宽松隔离（允许网络请求）</option>
                      </select>
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    <strong>安全说明：</strong>所有 Hook 在沙箱环境中运行，无法访问宿主系统资源。
                    超时或异常将自动触发降级策略，确保网关稳定性。
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                      <span className="font-medium text-sm">安全审查要求</span>
                    </div>
                    <ul className="text-xs text-secondary space-y-1.5 ml-6">
                      <li>Hook 代码必须通过静态安全扫描（无危险 API 调用）</li>
                      <li>不能包含文件系统写入、网络请求（除非明确授权）</li>
                      <li>不能访问环境变量或敏感配置</li>
                      <li>必须在超时时间内完成执行</li>
                      <li>草稿状态的 Hook 不会在线上环境生效</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      配置摘要
                    </div>
                    <div
                      className="grid grid-cols-2 gap-3 p-4 rounded-lg"
                      style={{ background: 'var(--bg-elevated)' }}
                    >
                      <div>
                        <div className="text-xs text-secondary">名称</div>
                        <div className="text-sm font-medium mt-0.5">{wizardName || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary">触发点</div>
                        <Badge variant={TRIGGER_CONFIG[wizardTrigger].badgeVariant} className="mt-0.5">
                          {wizardTrigger}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-secondary">作用范围</div>
                        <div className="text-sm font-medium mt-0.5">{wizardScope}</div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary">超时</div>
                        <div className="text-sm font-medium mt-0.5">{wizardTimeout}ms</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-secondary">描述</div>
                        <div className="text-sm mt-0.5">{wizardDesc || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <ShieldCheck size={14} />
                    <span>创建后将自动提交 IT 管理员进行安全审查。</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between mt-6 pt-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                {wizardStep > 0 && (
                  <Button variant="ghost" onClick={handleWizardPrev}>
                    上一步
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setWizardOpen(false)}>
                  取消
                </Button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <Button variant="primary" onClick={handleWizardNext}>
                    下一步
                  </Button>
                ) : (
                  <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={handleWizardSubmit}>
                    创建并提交审查
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getHookIcon(trigger: HookTrigger) {
  switch (trigger) {
    case 'before':
      return <Shield size={18} />
    case 'after':
      return <FileText size={18} />
    case 'error':
      return <AlertTriangle size={18} />
    case 'abort':
      return <XCircle size={18} />
    default:
      return <Zap size={18} />
  }
}

function Activity(props: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  )
}
