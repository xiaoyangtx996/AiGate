import { useState, useMemo } from 'react'
import {
  GitBranch,
  Layers,
  CheckCircle,
  MessageSquare,
  FileText,
  Plus,
  Search,
  X,
  ChevronRight,
  BarChart3,
  Zap,
  Code2,
  Database,
  Shield,
  Users,
  TrendingUp,
  ArrowUpRight,
  Info,
  Play,
  Copy,
  Eye,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
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

interface Skill {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  type: 'official' | 'enterprise'
  status: 'enabled' | 'disabled'
  version: string
  calls7d: number
  calls7dLabel: string
  avgLatency: number
  successRate: number
  author?: string
  usage: string
  variables: string[]
  createdAt: string
  lastUsed: string
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_SKILLS: Skill[] = [
  {
    id: '1',
    name: '代码审查',
    description: '根据企业编码规范对代码进行逐行 Review，输出结构化评审意见，支持 12 种主流语言。',
    icon: <GitBranch size={22} />,
    category: '代码',
    type: 'official',
    status: 'enabled',
    version: 'v3.2.0',
    calls7d: 2870,
    calls7dLabel: '2.87k',
    avgLatency: 320,
    successRate: 99.2,
    usage: '将待审查的代码粘贴到变量槽位，选择关注的审查维度（安全/性能/可读性），即可获得结构化评审报告。',
    variables: ['code', 'language', 'focus'],
    createdAt: '2025-12-01',
    lastUsed: '2 小时前',
  },
  {
    id: '2',
    name: '会议纪要整理',
    description: '将原始会议录音文字转化为结构化纪要，含决议事项与 Action Items。',
    icon: <Layers size={22} />,
    category: '文档',
    type: 'official',
    status: 'enabled',
    version: 'v2.1.0',
    calls7d: 1345,
    calls7dLabel: '1.35k',
    avgLatency: 280,
    successRate: 98.5,
    usage: '粘贴会议录音转写文本，自动提取关键决议、待办事项和责任人，生成标准化会议纪要。',
    variables: ['transcript', 'meeting_type'],
    createdAt: '2025-11-15',
    lastUsed: '30 分钟前',
  },
  {
    id: '3',
    name: '需求拆解',
    description: '将产品需求描述拆解为研发可执行的用户故事和验收标准。',
    icon: <CheckCircle size={22} />,
    category: '产品',
    type: 'official',
    status: 'enabled',
    version: 'v1.5.0',
    calls7d: 818,
    calls7dLabel: '818',
    avgLatency: 250,
    successRate: 97.8,
    usage: '输入产品需求描述，自动拆解为用户故事格式（As a...I want...So that...），并生成验收标准。',
    variables: ['requirement', 'team_context'],
    createdAt: '2025-10-20',
    lastUsed: '1 小时前',
  },
  {
    id: '4',
    name: 'SQL 生成',
    description: '根据自然语言描述生成 PostgreSQL 查询语句并解释执行计划。',
    icon: <Database size={22} />,
    category: '数据',
    type: 'enterprise',
    status: 'enabled',
    version: 'v2.0.0',
    calls7d: 1560,
    calls7dLabel: '1.56k',
    avgLatency: 180,
    successRate: 99.5,
    usage: '输入数据库 Schema 和自然语言查询需求，生成可执行的 SQL 语句并附带执行计划分析。',
    variables: ['question', 'schema'],
    createdAt: '2025-09-10',
    lastUsed: '15 分钟前',
    author: '数据团队',
  },
  {
    id: '5',
    name: '周报生成',
    description: '根据本周工作日志与任务列表自动生成周报初稿。',
    icon: <FileText size={22} />,
    category: '文档',
    type: 'enterprise',
    status: 'disabled',
    version: 'v1.0.0',
    calls7d: 0,
    calls7dLabel: '0',
    avgLatency: 0,
    successRate: 0,
    usage: '输入本周的工作日志和任务完成情况，自动生成结构化周报，包含工作亮点、问题总结和下周计划。',
    variables: ['work_logs', 'task_list'],
    createdAt: '2026-01-05',
    lastUsed: '从未使用',
    author: '张三',
  },
  {
    id: '6',
    name: 'API 文档生成',
    description: '根据代码注释和函数签名自动生成 OpenAPI 3.0 规范文档。',
    icon: <Code2 size={22} />,
    category: '代码',
    type: 'enterprise',
    status: 'enabled',
    version: 'v1.3.0',
    calls7d: 680,
    calls7dLabel: '680',
    avgLatency: 420,
    successRate: 96.8,
    usage: '粘贴代码文件或函数，自动生成符合 OpenAPI 3.0 规范的接口文档，包含请求/响应示例。',
    variables: ['code', 'language', 'base_url'],
    createdAt: '2025-11-28',
    lastUsed: '3 小时前',
    author: '后端团队',
  },
  {
    id: '7',
    name: '客户工单分诊',
    description: '根据工单正文自动判定优先级、归类负责团队、生成首条标准回复草稿。',
    icon: <MessageSquare size={22} />,
    category: '客服',
    type: 'enterprise',
    status: 'enabled',
    version: 'v2.2.0',
    calls7d: 1240,
    calls7dLabel: '1.24k',
    avgLatency: 290,
    successRate: 98.1,
    usage: '粘贴客户工单内容，自动判断工单优先级（P0-P3）、归属团队，并生成首条回复草稿。',
    variables: ['ticket_content', 'product_area'],
    createdAt: '2025-10-12',
    lastUsed: '45 分钟前',
    author: '客服团队',
  },
  {
    id: '8',
    name: '安全漏洞扫描',
    description: '对代码进行安全漏洞扫描，识别 OWASP Top 10 风险并提供修复建议。',
    icon: <Shield size={22} />,
    category: '安全',
    type: 'official',
    status: 'enabled',
    version: 'v1.8.0',
    calls7d: 430,
    calls7dLabel: '430',
    avgLatency: 520,
    successRate: 99.0,
    usage: '粘贴待扫描的代码文件，自动识别 SQL 注入、XSS、CSRF 等安全漏洞，并提供修复代码示例。',
    variables: ['code', 'language', 'scan_depth'],
    createdAt: '2025-12-20',
    lastUsed: '2 小时前',
  },
]

/* ------------------------------------------------------------------ */
/*  Stats computation                                                  */
/* ------------------------------------------------------------------ */

const STATS = {
  totalSkills: MOCK_SKILLS.length,
  enabledSkills: MOCK_SKILLS.filter((s) => s.status === 'enabled').length,
  officialSkills: MOCK_SKILLS.filter((s) => s.type === 'official').length,
  enterpriseSkills: MOCK_SKILLS.filter((s) => s.type === 'enterprise').length,
  totalCalls7d: MOCK_SKILLS.reduce((sum, s) => sum + s.calls7d, 0),
  avgSuccessRate: +(
    MOCK_SKILLS.filter((s) => s.calls7d > 0).reduce((sum, s) => sum + s.successRate, 0) /
    MOCK_SKILLS.filter((s) => s.calls7d > 0).length
  ).toFixed(1),
  topSkills: [...MOCK_SKILLS].sort((a, b) => b.calls7d - a.calls7d).slice(0, 5),
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'public', label: '公共市场', count: MOCK_SKILLS.filter((s) => s.type === 'official').length },
  { id: 'private', label: '企业私有库', count: MOCK_SKILLS.filter((s) => s.type === 'enterprise').length },
  { id: 'stats', label: '调用统计' },
]

/* ------------------------------------------------------------------ */
/*  Wizard Steps                                                       */
/* ------------------------------------------------------------------ */

const WIZARD_STEPS = [
  { id: 'basic', title: '基本信息', description: '名称与分类' },
  { id: 'template', title: '提示词模板', description: '定义技能逻辑' },
  { id: 'config', title: '高级配置', description: '参数与权限' },
  { id: 'review', title: '确认发布', description: '检查并提交' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Skills() {
  const [activeTab, setActiveTab] = useState('public')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('全部分类')
  const [statusFilter, setStatusFilter] = useState('全部状态')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'usage' | 'stats'>('overview')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [skillName, setSkillName] = useState('')
  const [skillCategory, setSkillCategory] = useState('代码')
  const [confirmAction, setConfirmAction] = useState<{ type: string; skillName?: string } | null>(null)
  const { addToast } = useUIStore()

  const hasActiveFilters = categoryFilter !== '全部分类' || statusFilter !== '全部状态'

  const clearFilters = () => {
    setCategoryFilter('全部分类')
    setStatusFilter('全部状态')
    setSearch('')
  }

  const filteredSkills = useMemo(() => {
    return MOCK_SKILLS.filter((skill) => {
      const matchesTab = activeTab === 'public' ? skill.type === 'official' : activeTab === 'private' ? skill.type === 'enterprise' : true
      const matchesSearch = !search || skill.name.toLowerCase().includes(search.toLowerCase()) || skill.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === '全部分类' || skill.category === categoryFilter
      const matchesStatus = statusFilter === '全部状态' || (statusFilter === '启用' ? skill.status === 'enabled' : skill.status === 'disabled')
      return matchesTab && matchesSearch && matchesCategory && matchesStatus
    })
  }, [activeTab, search, categoryFilter, statusFilter])

  const openDrawer = (skill: Skill) => {
    setActiveSkill(skill)
    setDrawerTab('overview')
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setActiveSkill(null)
  }

  const handleCreateSkill = () => {
    if (!skillName.trim()) {
      addToast({ type: 'warning', title: '请输入技能名称' })
      return
    }
    addToast({ type: 'success', title: '创建成功', message: `技能「${skillName}」已创建，进入草稿状态` })
    setWizardOpen(false)
    setWizardStep(0)
    setSkillName('')
  }

  const handleDelete = (name: string) => {
    setConfirmAction({ type: 'delete', skillName: name })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'delete') {
      addToast({ type: 'success', title: '已删除', message: `技能「${confirmAction.skillName}」已删除` })
      closeDrawer()
    }
    setConfirmAction(null)
  }

  const nextStep = () => {
    if (wizardStep === 0 && !skillName.trim()) {
      addToast({ type: 'warning', title: '请输入技能名称' })
      return
    }
    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep(wizardStep + 1)
    }
  }

  const prevStep = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1)
    }
  }

  return (
    <div>
      <PageHeader
        title="Skills 技能库"
        subtitle="可复用的提示词模板与任务技能，支持公共市场与企业私有库双轨管理。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'Skills 技能库' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setWizardOpen(true)}>
            创建技能
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Search & Filters */}
      {activeTab !== 'stats' && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="搜索技能名称或描述..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="input text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option>全部分类</option>
              <option>代码</option>
              <option>文档</option>
              <option>产品</option>
              <option>数据</option>
              <option>客服</option>
              <option>安全</option>
            </select>
            <select
              className="input text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option>全部状态</option>
              <option>启用</option>
              <option>停用</option>
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
              共 <strong style={{ color: 'var(--text-primary)' }}>{filteredSkills.length}</strong> 个技能
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'stats' ? (
        /* ============================================================ */
        /*  Stats Tab                                                   */
        /* ============================================================ */
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <Zap size={18} />
                </div>
                <span className="text-xs text-secondary">技能总数</span>
              </div>
              <div className="text-2xl font-bold">{STATS.totalSkills}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: 'var(--brand-main)' }}>{STATS.enabledSkills} 已启用</span>
                <span className="text-xs text-secondary">/</span>
                <span className="text-xs text-secondary">{STATS.totalSkills - STATS.enabledSkills} 已停用</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <BarChart3 size={18} />
                </div>
                <span className="text-xs text-secondary">近 7 天总调用</span>
              </div>
              <div className="text-2xl font-bold">{STATS.totalCalls7d.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} style={{ color: 'var(--brand-main)' }} />
                <span className="text-xs" style={{ color: 'var(--brand-main)' }}>较上周 +18.6%</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <TrendingUp size={18} />
                </div>
                <span className="text-xs text-secondary">平均成功率</span>
              </div>
              <div className="text-2xl font-bold">{STATS.avgSuccessRate}%</div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} style={{ color: 'var(--brand-main)' }} />
                <span className="text-xs" style={{ color: 'var(--brand-main)' }}>较上周 +0.3%</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--brand-main)' }}
                >
                  <Users size={18} />
                </div>
                <span className="text-xs text-secondary">资产分布</span>
              </div>
              <div className="text-2xl font-bold">{STATS.officialSkills} + {STATS.enterpriseSkills}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: 'var(--brand-main)' }}>{STATS.officialSkills} 官方</span>
                <span className="text-xs text-secondary">/</span>
                <span className="text-xs" style={{ color: 'var(--brand-accent)' }}>{STATS.enterpriseSkills} 企业</span>
              </div>
            </Card>
          </div>

          {/* Top 5 Skills by Calls */}
          <Card>
            <CardHeader>
              <CardTitle>调用排行 Top 5</CardTitle>
              <span className="text-xs text-secondary">近 7 天</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {STATS.topSkills.map((skill, idx) => {
                  const maxCalls = STATS.topSkills[0].calls7d
                  const barWidth = maxCalls > 0 ? (skill.calls7d / maxCalls) * 100 : 0
                  return (
                    <div key={skill.id} className="flex items-center gap-4">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: idx === 0 ? 'var(--brand-main)' : 'var(--bg-elevated)',
                          color: idx === 0 ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{skill.name}</span>
                          <span className="text-sm font-bold shrink-0 ml-2">{skill.calls7dLabel}</span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--bg-elevated)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              background: idx === 0 ? 'var(--brand-main)' : 'var(--brand-accent)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-secondary shrink-0 w-16 text-right">
                        {skill.avgLatency}ms
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-skill detail table */}
          <Card>
            <CardHeader>
              <CardTitle>技能明细</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">技能名称</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">分类</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">版本</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">类型</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-secondary">状态</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-secondary">调用量</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-secondary">成功率</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-secondary">平均延迟</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_SKILLS.map((skill) => (
                      <tr key={skill.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span style={{ color: 'var(--brand-main)' }}>{skill.icon}</span>
                            <span className="font-medium">{skill.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-secondary">{skill.category}</td>
                        <td className="py-3 px-2 text-secondary">{skill.version}</td>
                        <td className="py-3 px-2">
                          <Badge variant={skill.type === 'official' ? 'success' : 'warning'}>
                            {skill.type === 'official' ? '官方' : '企业'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={skill.status === 'enabled' ? 'success' : 'warning'}>
                            {skill.status === 'enabled' ? '启用' : '停用'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">{skill.calls7dLabel}</td>
                        <td className="py-3 px-2 text-right">
                          <span style={{ color: skill.successRate >= 99 ? 'var(--brand-main)' : skill.successRate >= 95 ? 'var(--brand-accent)' : '#ef4444' }}>
                            {skill.successRate > 0 ? `${skill.successRate}%` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-secondary">
                          {skill.avgLatency > 0 ? `${skill.avgLatency}ms` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : filteredSkills.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="暂无技能"
          description={
            hasActiveFilters
              ? '没有符合筛选条件的技能，请调整筛选项'
              : activeTab === 'public'
                ? '公共市场暂无可用技能'
                : '还没有注册任何企业私有技能'
          }
          action={
            hasActiveFilters
              ? { label: '清除筛选', onClick: clearFilters }
              : activeTab === 'private'
                ? { label: '创建技能', onClick: () => setWizardOpen(true) }
                : undefined
          }
        />
      ) : (
        <>
          {/* Skill Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map((skill) => (
              <Card key={skill.id} hover className="flex flex-col hover:-translate-y-1 transition-transform duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl border flex items-center justify-center"
                      style={{
                        background: 'var(--bg-body)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--brand-main)',
                      }}
                    >
                      {skill.icon}
                    </div>
                    <div>
                      <div className="text-xs text-secondary font-bold uppercase tracking-widest">
                        {skill.category} &middot; {skill.version}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={skill.type === 'official' ? 'success' : 'warning'}>
                      {skill.type === 'official' ? '官方' : '企业'}
                    </Badge>
                    <Badge variant={skill.status === 'enabled' ? 'success' : 'warning'}>
                      {skill.status === 'enabled' ? '启用' : '停用'}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-bold text-base mb-1">{skill.name}</h3>
                <p className="text-secondary text-sm flex-1 mb-3">{skill.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {skill.variables.map((v) => (
                    <span
                      key={v}
                      className="badge text-xs font-mono"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
                <div
                  className="flex justify-between items-center border-t pt-3 mt-auto text-xs"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <span className="text-secondary">
                    调用 {skill.calls7dLabel} &middot; {skill.successRate > 0 ? `${skill.successRate}%` : '-'} &middot; {skill.avgLatency > 0 ? `${skill.avgLatency}ms` : '-'}
                    {skill.author && <> &middot; {skill.author}</>}
                  </span>
                  <button
                    className="text-brand-main font-bold hover:underline cursor-pointer flex items-center gap-1"
                    onClick={() => openDrawer(skill)}
                  >
                    详情 <ChevronRight size={14} />
                  </button>
                </div>
              </Card>
            ))}

            {/* New Skill Card */}
            {activeTab === 'private' && (
              <div
                className="card flex flex-col items-center justify-center text-center text-secondary hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
                style={{
                  borderStyle: 'dashed',
                  background: 'transparent',
                  minHeight: '160px',
                  borderColor: 'var(--border-color)',
                }}
                onClick={() => setWizardOpen(true)}
              >
                <Plus size={36} strokeWidth={1.5} className="mb-3" />
                <div className="font-bold">创建新技能</div>
                <div className="text-xs mt-1">含提示词模板 + 变量插槽 + 版本管理</div>
              </div>
            )}
          </div>

          {/* Info Card */}
          <div
            className="card mt-6"
            style={{
              background: 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))',
            }}
          >
            <div className="flex items-start gap-4">
              <Info
                size={22}
                className="flex-shrink-0 mt-0.5"
                style={{ color: 'var(--brand-main)' }}
              />
              <div>
                <div className="font-bold mb-1">提示词 (Prompt) vs 技能 (Skill) vs Agent</div>
                <div className="text-secondary text-sm leading-relaxed">
                  <strong>提示词</strong> 是颗粒度最小的 AI 资产，是含变量插槽的文本模板；
                  <strong>Skill</strong> 在 Prompt 之上叠加多步流程与工具调用，构成「能力包」；
                  <strong>Agent</strong> 则消费 Prompt + Skill + MCP + 知识库，对外提供完整的对话体验。三者形成「原子 - 复合 - 智能体」三级资产体系。
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  Skill Detail Drawer                                         */}
      {/* ============================================================ */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={activeSkill?.name ?? ''}
        description={activeSkill ? `${activeSkill.category} · ${activeSkill.version}` : ''}
        width="md"
      >
        {activeSkill && (
          <div className="space-y-5">
            {/* Drawer Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              {([
                { id: 'overview', label: '概览', icon: <Eye size={14} /> },
                { id: 'usage', label: '使用说明', icon: <FileText size={14} /> },
                { id: 'stats', label: '调用统计', icon: <BarChart3 size={14} /> },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer"
                  style={{
                    background: drawerTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                    color: drawerTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: drawerTab === tab.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {drawerTab === 'overview' && (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl border flex items-center justify-center"
                    style={{
                      background: 'var(--bg-body)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--brand-main)',
                    }}
                  >
                    {activeSkill.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{activeSkill.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={activeSkill.type === 'official' ? 'success' : 'warning'}>
                        {activeSkill.type === 'official' ? '官方' : '企业'}
                      </Badge>
                      <Badge variant={activeSkill.status === 'enabled' ? 'success' : 'warning'}>
                        {activeSkill.status === 'enabled' ? '启用' : '停用'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">技能描述</label>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {activeSkill.description}
                  </p>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-1">分类</div>
                    <div className="text-sm font-medium">{activeSkill.category}</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-1">版本</div>
                    <div className="text-sm font-medium">{activeSkill.version}</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-1">创建时间</div>
                    <div className="text-sm font-medium">{activeSkill.createdAt}</div>
                  </div>
                  <div
                    className="p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-1">最近使用</div>
                    <div className="text-sm font-medium">{activeSkill.lastUsed}</div>
                  </div>
                </div>

                {/* Variables */}
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">变量插槽</label>
                  <div className="flex flex-wrap gap-2">
                    {activeSkill.variables.map((v) => (
                      <span
                        key={v}
                        className="badge text-xs font-mono"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                >
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--brand-main)' }}>
                        {activeSkill.calls7dLabel}
                      </div>
                      <div className="text-xs text-secondary mt-1">近 7 天调用</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--brand-main)' }}>
                        {activeSkill.successRate > 0 ? `${activeSkill.successRate}%` : '-'}
                      </div>
                      <div className="text-xs text-secondary mt-1">成功率</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--brand-main)' }}>
                        {activeSkill.avgLatency > 0 ? `${activeSkill.avgLatency}ms` : '-'}
                      </div>
                      <div className="text-xs text-secondary mt-1">平均延迟</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Usage Tab */}
            {drawerTab === 'usage' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">使用说明</label>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {activeSkill.usage}
                  </p>
                </div>

                {/* Example Variables */}
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">变量说明</label>
                  <div className="space-y-2">
                    {activeSkill.variables.map((v, idx) => (
                      <div
                        key={v}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'var(--brand-main)', color: '#fff' }}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <code className="text-xs font-mono" style={{ color: 'var(--brand-main)' }}>
                            {`{{${v}}}`}
                          </code>
                          <span className="text-xs text-secondary ml-2">
                            {v === 'code' ? '待审查的源代码' : v === 'language' ? '编程语言（如 Python、TypeScript）' : v === 'focus' ? '审查维度（安全/性能/可读性）' : v === 'transcript' ? '会议录音转写文本' : v === 'meeting_type' ? '会议类型（周会/评审/头脑风暴）' : v === 'requirement' ? '产品需求描述' : v === 'team_context' ? '团队上下文信息' : v === 'question' ? '自然语言查询' : v === 'schema' ? '数据库 Schema 定义' : v === 'ticket_content' ? '客户工单内容' : v === 'product_area' ? '产品领域' : v === 'base_url' ? 'API 基础 URL' : v === 'scan_depth' ? '扫描深度（quick/full）' : v === 'work_logs' ? '本周工作日志' : v === 'task_list' ? '任务完成列表' : '输入内容'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invocation Example */}
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">调用示例</label>
                  <pre
                    className="p-4 rounded-lg border font-mono text-xs leading-relaxed overflow-x-auto"
                    style={{
                      borderColor: 'var(--border-color)',
                      background: 'color-mix(in srgb, currentColor 10%, var(--bg-surface))',
                      color: 'var(--text-primary)',
                    }}
                  >
{`# 通过 API 调用
curl -X POST https://api.aigate.com/v1/skills/${activeSkill.id}/invoke \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{"variables": {${activeSkill.variables.map((v) => `\n    "${v}": "..."`).join(',')}}}'`}
                  </pre>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {drawerTab === 'stats' && (
              <div className="space-y-4">
                {/* Trend Placeholder */}
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">调用趋势（近 7 天）</label>
                  <div
                    className="h-40 rounded-lg border flex items-center justify-center"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-center">
                      <BarChart3 size={32} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                      <div className="text-xs text-secondary">调用趋势图表（待接入 ECharts）</div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">性能指标</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">成功率</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${activeSkill.successRate}%`,
                              background: activeSkill.successRate >= 99 ? 'var(--brand-main)' : activeSkill.successRate >= 95 ? 'var(--brand-accent)' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', minWidth: 48, textAlign: 'right' }}>
                          {activeSkill.successRate > 0 ? `${activeSkill.successRate}%` : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">平均延迟</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {activeSkill.avgLatency > 0 ? `${activeSkill.avgLatency}ms` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">近 7 天调用</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {activeSkill.calls7dLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">创建时间</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {activeSkill.createdAt}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">最近使用</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {activeSkill.lastUsed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Consumers Placeholder */}
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">高频调用者</label>
                  <div className="space-y-2">
                    {[
                      { name: '数据团队 Agent', calls: '892 次', percent: '31%' },
                      { name: '后端研发 Agent', calls: '654 次', percent: '23%' },
                      { name: '测试自动化 Agent', calls: '421 次', percent: '15%' },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <span className="text-sm">{item.name}</span>
                        <span className="text-xs text-secondary">
                          {item.calls} ({item.percent})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div
              className="flex justify-between items-center pt-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(activeSkill.name)}
              >
                删除
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={closeDrawer}>
                  关闭
                </Button>
                <Button variant="secondary" size="sm" icon={<Copy size={14} />}>
                  复制调用
                </Button>
                <Button variant="primary" size="sm" icon={<Play size={14} />}>
                  测试调用
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
        title="确认删除技能"
        description={`删除后技能「${confirmAction?.skillName}」的所有配置和版本将被清除，此操作不可逆。`}
        confirmText="删除"
        variant="danger"
      />

      {/* ============================================================ */}
      {/*  Create Skill Wizard                                         */}
      {/* ============================================================ */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-surface)' }}
          >
            {/* Wizard Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 border-b"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}
            >
              <div>
                <h2 className="text-lg font-semibold">创建新技能</h2>
                <p className="text-sm text-secondary mt-1">
                  定义一个可复用的提示词模板技能，可绑定到 Agent 或在对话中直接调用。
                </p>
              </div>
              <button
                onClick={() => {
                  setWizardOpen(false)
                  setWizardStep(0)
                }}
                className="p-1 rounded-lg hover:bg-elevated transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-6 pt-4">
              <Stepper steps={WIZARD_STEPS} currentStep={wizardStep} className="mb-6" />
            </div>

            {/* Step Content */}
            <div className="px-6 pb-4">
              {/* Step 0: Basic Info */}
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <Input
                    label="技能名称"
                    placeholder="例如：SQL 生成、代码审查、周报生成"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                  />
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      技能分类
                    </label>
                    <select
                      className="input"
                      value={skillCategory}
                      onChange={(e) => setSkillCategory(e.target.value)}
                    >
                      <option>代码</option>
                      <option>文档</option>
                      <option>产品</option>
                      <option>数据</option>
                      <option>客服</option>
                      <option>安全</option>
                      <option>其他</option>
                    </select>
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      技能描述
                    </label>
                    <textarea
                      className="input h-20"
                      placeholder="描述该技能的用途和触发场景..."
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      可见范围
                    </label>
                    <select className="input">
                      <option>企业私有（仅本企业可见）</option>
                      <option>部门可见</option>
                      <option>项目可见</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 1: Prompt Template */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      提示词模板
                    </label>
                    <textarea
                      className="input font-mono text-xs h-40"
                      placeholder={'你是一个代码审查专家。请根据以下编码规范对代码进行逐行 Review...\n\n重点关注：{{focus}}\n编程语言：{{language}}\n\n代码：\n{{code}}'}
                    />
                    <p className="text-xs text-secondary mt-1.5">
                      使用 {'{{变量名}}'} 语法定义变量插槽，调用时可动态替换。
                    </p>
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      变量定义（每行一个）
                    </label>
                    <textarea
                      className="input font-mono text-xs h-24"
                      placeholder={'code: 待审查的源代码\nlanguage: 编程语言\nfocus: 审查维度'}
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      默认模型
                    </label>
                    <select className="input">
                      <option>GPT-4o</option>
                      <option>Claude-3.5 Sonnet</option>
                      <option>Gemini-1.5 Pro</option>
                      <option>跟随 Agent 配置</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Advanced Config */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="温度 (Temperature)"
                      placeholder="0.7"
                      type="number"
                    />
                    <Input
                      label="最大 Token 数"
                      placeholder="4096"
                      type="number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        超时时间
                      </label>
                      <select className="input">
                        <option>30 秒</option>
                        <option>60 秒</option>
                        <option>120 秒</option>
                      </select>
                    </div>
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        重试策略
                      </label>
                      <select className="input">
                        <option>不重试</option>
                        <option>重试 1 次</option>
                        <option>重试 2 次</option>
                        <option>重试 3 次</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      标签（逗号分隔）
                    </label>
                    <input
                      className="input"
                      placeholder="例如：代码质量, 自动化, 生产力"
                    />
                  </div>
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: 'var(--brand-main)' }} />
                      <div>
                        <div className="text-sm font-medium">启用沙箱测试</div>
                        <div className="text-xs text-secondary">允许在创建后进行沙箱调试</div>
                      </div>
                    </label>
                  </div>
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: 'var(--brand-main)' }} defaultChecked />
                      <div>
                        <div className="text-sm font-medium">记录调用日志</div>
                        <div className="text-xs text-secondary">记录每次调用的输入输出用于审计</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-2 uppercase">技能名称</div>
                    <div className="font-medium">{skillName || '未填写'}</div>
                  </div>
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-2 uppercase">分类</div>
                    <div className="font-medium">{skillCategory}</div>
                  </div>
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-2 uppercase">可见范围</div>
                    <div className="font-medium">企业私有</div>
                  </div>
                  <div
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="text-xs text-secondary mb-2 uppercase">初始状态</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">草稿</Badge>
                      <span className="text-xs text-secondary">创建后需配置提示词模板并启用</span>
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-lg border"
                    style={{
                      borderColor: 'var(--brand-main)',
                      background: 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Info size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--brand-main)' }} />
                      <div className="text-sm text-secondary">
                        技能创建后将进入草稿状态，您可以在技能详情中完善提示词模板、配置变量插槽，然后启用该技能。
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div
              className="sticky bottom-0 flex justify-between items-center p-6 pt-4 border-t"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}
            >
              <div>
                {wizardStep > 0 && (
                  <Button variant="secondary" onClick={prevStep}>
                    上一步
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setWizardOpen(false)
                    setWizardStep(0)
                  }}
                >
                  取消
                </Button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <Button variant="primary" onClick={nextStep}>
                    下一步
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleCreateSkill}>
                    创建技能
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
