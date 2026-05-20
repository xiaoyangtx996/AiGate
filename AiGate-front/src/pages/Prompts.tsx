import { useState } from 'react'
import {
  BookOpen,
  Code2,
  MessageSquare,
  BarChart3,
  Languages,
  Plus,
  Upload,
  Info,
  Play,
  ChevronRight,
  Search,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'

interface PromptTemplate {
  id: string
  title: string
  category: string
  version: string
  icon: React.ReactNode
  badge: 'official' | 'enterprise'
  description: string
  variables: string[]
  stats: {
    rating: number
    calls: string
    tokens: string
    author?: string
  }
  template: string
  placeholders: Record<string, string>
}

const PROMPTS: PromptTemplate[] = [
  {
    id: 'email-rewrite',
    title: '商务邮件改写助手',
    category: '写作',
    version: 'v2.1.0',
    icon: <BookOpen size={20} />,
    badge: 'official',
    description: '将口语化或随意的内容改写为正式商务邮件，支持中英文与不同语气强度。',
    variables: ['content', 'tone', 'lang'],
    stats: { rating: 4.8, calls: '12.4k', tokens: '~180 Token' },
    template:
      '请将以下非正式邮件内容：\n"""\n{{content}}\n"""\n改写为一封专业的 {{tone}} 语气商务邮件，并使用 {{lang}} 语言输出。',
    placeholders: {
      content: '嗨老铁，明天那个会我不去了哈，帮我跟老大说声抱歉。',
      tone: '极其礼貌且委婉',
      lang: '中文',
    },
  },
  {
    id: 'code-review',
    title: '代码评审 Prompt',
    category: '代码',
    version: 'v3.0.2',
    icon: <Code2 size={20} />,
    badge: 'official',
    description:
      '按语言与关注点（性能 / 安全 / 可读性）生成结构化评审意见，支持 12 种主流语言。',
    variables: ['code', 'language', 'focus'],
    stats: { rating: 4.9, calls: '28.7k', tokens: '~520 Token' },
    template:
      '作为资深架构师，请对以下 {{language}} 代码进行深度审查，重点关注 {{focus}} 安全性与性能：\n\n```\n{{code}}\n```',
    placeholders: {
      language: 'Python',
      focus: '内存泄漏与并发安全',
      code: 'def get_data():\n    global cache_list\n    cache_list.append(fetch_from_db())\n    return cache_list',
    },
  },
  {
    id: 'ticket-triage',
    title: '客户工单分诊',
    category: '客服',
    version: 'v1.4.0',
    icon: <MessageSquare size={20} />,
    badge: 'enterprise',
    description: '根据工单正文自动判定优先级、归类负责团队、生成首条标准回复草稿。',
    variables: ['ticket', 'product'],
    stats: { rating: 4.6, calls: '5.2k', tokens: '~320 Token', author: '张三' },
    template:
      '请根据下述工单正文：\n"""\n{{ticket}}\n"""\n判定产品类别为 {{product}} 相关的优先级，并生成第一条自动回复草稿。',
    placeholders: {
      ticket: '我的订单昨晚支付成功了但是现在还没收到激活邮件，能不能退款啊？',
      product: '支付与结算系统',
    },
  },
  {
    id: 'nl2sql',
    title: 'SQL 自然语言转换',
    category: '数据分析',
    version: 'v1.0.0',
    icon: <BarChart3 size={20} />,
    badge: 'enterprise',
    description: '把自然语言问题翻译为可在 PostgreSQL 上执行的 SQL，并附带字段解释。',
    variables: ['question', 'schema'],
    stats: { rating: 4.7, calls: '8.9k', tokens: '~410 Token', author: '李四' },
    template:
      '根据以下 PostgreSQL 数据库 Schema：\n{{schema}}\n\n请将自然语言提问："{{question}}" 转换为合规的 SQL 查询语句。',
    placeholders: {
      schema: 'TABLE users (id SERIAL, name VARCHAR, created_at TIMESTAMP);',
      question: '查询过去3天内新注册的用户总数是多少？',
    },
  },
  {
    id: 'tech-translate',
    title: '中英技术文档互译',
    category: '翻译',
    version: 'v1.2.1',
    icon: <Languages size={20} />,
    badge: 'official',
    description: '保留原文的代码块与排版，针对技术领域专用名词建立术语对照表。',
    variables: ['text', 'direction'],
    stats: { rating: 4.8, calls: '16.3k', tokens: '~260 Token' },
    template:
      '请将以下技术文档原文进行专业互译，保留所有 Markdown 格式：\n"""\n{{text}}\n"""\n翻译方向：{{direction}}，确保专业术语对照无误。',
    placeholders: {
      text: '# Getting Started\nFirst run `npm install` to setup local dependencies.',
      direction: '英文 -> 中文',
    },
  },
]

type TabId = 'public' | 'private' | 'draft'

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'public', label: '公共市场', count: 128 },
  { id: 'private', label: '企业私有库', count: 42 },
  { id: 'draft', label: '我的草稿', count: 3 },
]

export default function Prompts() {
  const [activeTab, setActiveTab] = useState<TabId>('public')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部分类')
  const [model, setModel] = useState('全部模型')
  const [sort, setSort] = useState('按热度')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activePrompt, setActivePrompt] = useState<PromptTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  const openDrawer = (prompt: PromptTemplate) => {
    setActivePrompt(prompt)
    setVariableValues({ ...prompt.placeholders })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setActivePrompt(null)
    setVariableValues({})
  }

  const renderPreview = () => {
    if (!activePrompt) return ''
    let result = activePrompt.template
    for (const [varName, val] of Object.entries(variableValues)) {
      result = result.replace(
        new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'),
        val || `{{${varName}}}`
      )
    }
    return result
  }

  const handleTestInvocation = () => {
    alert(
      '[演示环境] 正在模拟调用大模型进行 Sandbox 测试，请稍候...\n\n生成结果成功，模型返回 200 OK！'
    )
  }

  return (
    <div>
      <PageHeader
        title="提示词库"
        subtitle="企业级 Prompt 资产沉淀：精选模板、变量化复用、版本管理与沙箱调试。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: '提示词库' }]}
        actions={
          <>
            <Button variant="secondary" icon={<Upload size={16} />}>
              导入模板
            </Button>
            <Button variant="primary" icon={<Plus size={16} />}>
              新建提示词
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <Card className="p-0 mb-6 overflow-hidden">
        <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-5 py-3.5 font-bold text-sm border-b-2 transition-colors cursor-pointer"
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottomColor:
                  activeTab === tab.id ? 'var(--brand-main)' : 'transparent',
                background: 'transparent',
              }}
            >
              {tab.label}
              <span className="text-secondary font-normal text-xs ml-1">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div
          className="px-5 py-4 flex gap-3 flex-wrap items-center"
          style={{
            background: 'color-mix(in srgb, var(--brand-main) 3%, var(--bg-surface))',
          }}
        >
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              className="input text-sm pl-9 w-full"
              placeholder="搜索提示词标题、描述或标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input text-xs font-bold"
            style={{ width: 'auto' }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>全部分类</option>
            <option>写作</option>
            <option>代码</option>
            <option>营销</option>
            <option>客服</option>
            <option>翻译</option>
            <option>数据分析</option>
          </select>
          <select
            className="input text-xs font-bold"
            style={{ width: 'auto' }}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option>全部模型</option>
            <option>GPT-4o</option>
            <option>Claude-3.5</option>
            <option>Gemini-1.5</option>
          </select>
          <select
            className="input text-xs font-bold"
            style={{ width: 'auto' }}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>按热度</option>
            <option>按更新时间</option>
            <option>按评分</option>
          </select>
        </div>
      </Card>

      {/* Prompt Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROMPTS.map((prompt) => (
          <Card
            key={prompt.id}
            hover
            className="flex flex-col hover:-translate-y-1 transition-transform duration-200"
          >
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
                  {prompt.icon}
                </div>
                <div>
                  <div className="text-xs text-secondary font-bold uppercase tracking-widest">
                    {prompt.category} &middot; {prompt.version}
                  </div>
                </div>
              </div>
              <Badge variant={prompt.badge === 'official' ? 'success' : 'warning'}>
                {prompt.badge === 'official' ? '官方' : '企业'}
              </Badge>
            </div>
            <h3 className="font-bold text-base mb-1">{prompt.title}</h3>
            <p className="text-secondary text-sm flex-1 mb-3">{prompt.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {prompt.variables.map((v) => (
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
                {prompt.stats.rating} &middot; 调用 {prompt.stats.calls} &middot;{' '}
                {prompt.stats.tokens}
                {prompt.stats.author && <> &middot; 作者 {prompt.stats.author}</>}
              </span>
              <button
                className="text-brand-main font-bold hover:underline cursor-pointer flex items-center gap-1"
                onClick={() => openDrawer(prompt)}
              >
                试用 <ChevronRight size={14} />
              </button>
            </div>
          </Card>
        ))}

        {/* New Prompt Card */}
        <div
          className="card flex flex-col items-center justify-center text-center text-secondary hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
          style={{
            borderStyle: 'dashed',
            background: 'transparent',
            minHeight: '160px',
            borderColor: 'var(--border-color)',
          }}
          onClick={() => alert('打开新建向导（占位）')}
        >
          <Plus size={36} strokeWidth={1.5} className="mb-3" />
          <div className="font-bold">新建提示词</div>
          <div className="text-xs mt-1">含变量插槽 + 沙箱调试 + 版本管理</div>
        </div>
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
            <div className="font-bold mb-1">提示词 vs 技能 (Skill) vs Agent</div>
            <div className="text-secondary text-sm leading-relaxed">
              <strong>提示词</strong> 是颗粒度最小的 AI 资产，是含变量插槽的文本模板；
              <strong>Skill</strong> 在 Prompt 之上叠加多步流程与工具调用，构成「能力包」；
              <strong>Agent</strong> 则消费 Prompt + Skill + MCP + 知识库，对外提供完整的对话体验。三者形成「原子 → 复合 → 智能体」三级资产体系。
            </div>
          </div>
        </div>
      </div>

      {/* Sandbox Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={activePrompt?.title ?? ''}
        description={activePrompt ? `${activePrompt.category} · ${activePrompt.version}` : ''}
        width="sm"
      >
        {activePrompt && (
          <div className="space-y-5">
            {/* Template Raw */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">
                Prompt 模板原文
              </label>
              <textarea
                className="w-full h-24 p-3 rounded-lg border text-xs font-mono leading-relaxed resize-none"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'color-mix(in srgb, currentColor 10%, var(--bg-surface))',
                }}
                readOnly
                value={activePrompt.template}
              />
            </div>

            {/* Variable Sandbox */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">
                变量填槽测试 (Variables Sandbox)
              </label>
              <div
                className="space-y-3 p-4 rounded-lg border"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-elevated, var(--bg-body))',
                }}
              >
                {activePrompt.variables.map((varName) => (
                  <div key={varName} className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">
                      {varName}
                    </label>
                    <input
                      className="input text-xs py-1.5 px-3 w-full"
                      value={variableValues[varName] ?? ''}
                      onChange={(e) =>
                        setVariableValues((prev) => ({ ...prev, [varName]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Rendered Preview */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">
                渲染组合提示词 (Rendered Prompt Preview)
              </label>
              <div
                className="w-full min-h-24 p-3 rounded-lg border text-xs font-mono leading-relaxed whitespace-pre-wrap"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'color-mix(in srgb, currentColor 10%, var(--bg-surface))',
                  color: 'var(--text-primary)',
                }}
              >
                {renderPreview()}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <Button variant="secondary" size="sm" onClick={closeDrawer}>
                关闭
              </Button>
              <Button variant="secondary" size="sm">
                高级调试中心
              </Button>
              <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={handleTestInvocation}>
                沙箱调用调试
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
