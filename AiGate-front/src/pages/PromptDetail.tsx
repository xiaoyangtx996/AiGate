import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { useUIStore } from '@/stores/ui'
import {
  ArrowLeft,
  Play,
  Copy,
  GitBranch,
  Clock,
  User,
  BarChart3,
  Zap,
  CheckCircle,
  RotateCcw,
  Send,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PromptVersion {
  id: string
  version: string
  status: 'published' | 'draft' | 'archived'
  createdAt: string
  author: string
  changes: string
  template: string
  variables: Record<string, string>
  stats?: {
    calls: number
    avgTokens: number
    avgLatency: number
  }
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_VERSIONS: PromptVersion[] = [
  {
    id: 'v3',
    version: 'v3.0.0',
    status: 'published',
    createdAt: '2026-05-20',
    author: '张三',
    changes: '优化代码审查输出格式，增加修复建议',
    template: '请用专业的语气审查以下 {{language}} 代码，重点关注 {{focus_area}}：\n\n{{code}}\n\n请按以下格式输出：\n1. 问题摘要\n2. 详细分析\n3. 修复建议\n4. 最佳实践',
    variables: { language: 'Python', focus_area: '内存泄漏', code: 'def process():\n  data = []\n  while True:\n    data.append(fetch())' },
    stats: { calls: 28420, avgTokens: 520, avgLatency: 1200 },
  },
  {
    id: 'v2',
    version: 'v2.1.0',
    status: 'archived',
    createdAt: '2026-04-15',
    author: '张三',
    changes: '支持多语言代码审查',
    template: '请审查以下 {{language}} 代码，关注 {{focus_area}}：\n\n{{code}}',
    variables: { language: 'JavaScript', focus_area: '性能优化', code: 'function loop() {\n  for(let i=0; i<1000; i++) {\n    setTimeout(() => console.log(i), 100)\n  }\n}' },
    stats: { calls: 15200, avgTokens: 380, avgLatency: 950 },
  },
  {
    id: 'v1',
    version: 'v1.0.0',
    status: 'archived',
    createdAt: '2026-03-01',
    author: '李四',
    changes: '初始版本',
    template: '审查代码：\n{{code}}',
    variables: { language: 'Python', focus_area: '安全性', code: '' },
    stats: { calls: 5800, avgTokens: 250, avgLatency: 800 },
  },
]

const MOCK_DRAFT: PromptVersion = {
  id: 'draft',
  version: 'draft',
  status: 'draft',
  createdAt: '2026-05-20',
  author: '张三',
  changes: '正在测试新的输出格式',
  template: '请用专业的语气审查以下 {{language}} 代码，重点关注 {{focus_area}}：\n\n{{code}}\n\n请输出 JSON 格式的结果。',
  variables: { language: 'TypeScript', focus_area: '类型安全', code: 'function add(a: any, b: any) {\n  return a + b\n}' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PromptDetail() {
  const { addToast } = useUIStore()

  // Active tab
  const [activeTab, setActiveTab] = useState('editor')

  // Version management
  const [selectedVersionId, setSelectedVersionId] = useState('v3')
  const [showDraft] = useState(false)

  // Editor variables
  const [variables, setVariables] = useState<Record<string, string>>(MOCK_VERSIONS[0].variables)
  const [template, setTemplate] = useState(MOCK_VERSIONS[0].template)

  // Sandbox
  const [sandboxModel, setSandboxModel] = useState('gpt-4o')
  const [sandboxLoading, setSandboxLoading] = useState(false)
  const [sandboxResult, setSandboxResult] = useState<string | null>(null)

  // A/B Test
  const [abModelA, setAbModelA] = useState('gpt-4o')
  const [abModelB, setAbModelB] = useState('claude-3-5-sonnet')
  const [abResultA, setAbResultA] = useState<string | null>(null)
  const [abResultB, setAbResultB] = useState<string | null>(null)
  const [abLoading, setAbLoading] = useState(false)

  // Get current version
  const currentVersion = useMemo(() => {
    if (showDraft) return MOCK_DRAFT
    return MOCK_VERSIONS.find((v) => v.id === selectedVersionId) || MOCK_VERSIONS[0]
  }, [selectedVersionId, showDraft])

  // Render template
  const renderedTemplate = useMemo(() => {
    let result = template
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    })
    return result
  }, [template, variables])

  // Update variable
  const updateVariable = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }))
  }

  // Run sandbox
  const handleRunSandbox = () => {
    setSandboxLoading(true)
    setSandboxResult(null)
    setTimeout(() => {
      setSandboxResult(
        `[${sandboxModel} 审查结果]\n\n1. **问题摘要**：检测到潜在的内存泄漏问题\n\n2. **详细分析**：\n   - 在 while True 循环中持续调用 fetch() 并追加到 data 列表\n   - 没有清理机制，data 列表会无限增长\n   - 最终导致内存溢出\n\n3. **修复建议**：\n   - 添加数据处理后的清理逻辑\n   - 设置最大缓存大小\n   - 使用生成器模式替代列表累积\n\n4. **最佳实践**：\n   - 使用 with 语句管理资源\n   - 实现背压控制机制`
      )
      setSandboxLoading(false)
    }, 1500)
  }

  // Run A/B test
  const handleRunAB = () => {
    setAbLoading(true)
    setAbResultA(null)
    setAbResultB(null)

    setTimeout(() => {
      setAbResultA(
        `[${abModelA} 输出]\n\n审查结果：\n- 发现类型安全问题：参数使用 any 类型\n- 建议使用泛型或具体类型\n- 运行时可能出现类型错误`
      )
      setAbResultB(
        `[${abModelB} 输出]\n\n代码审查报告：\n1. 类型安全：函数参数使用 any 类型，丧失了 TypeScript 的类型检查优势\n2. 运行时风险：a + b 在类型不匹配时可能产生意外结果\n3. 建议改进：\n   \`\`\`typescript\n   function add<T extends number | string>(a: T, b: T): T {\n     return (a as any) + (b as any) as T\n   }\n   \`\`\``
      )
      setAbLoading(false)
    }, 2000)
  }

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: '复制成功' })
  }

  // Tabs
  const tabs = [
    { id: 'editor', label: '编辑器' },
    { id: 'sandbox', label: '沙箱调试' },
    { id: 'ab-test', label: 'A/B 对比' },
    { id: 'versions', label: '版本管理' },
    { id: 'stats', label: '调用统计' },
  ]

  return (
    <div>
      <PageHeader
        title="代码评审 Prompt"
        subtitle="编辑提示词版本，填槽调试，进行 A/B 真实测试。"
        breadcrumbs={[
          { label: 'AI 资产市场' },
          { label: '提示词库', path: '/prompts' },
          { label: '代码评审' },
        ]}
        actions={
          <div className="flex gap-2">
            <Badge variant={currentVersion.status === 'published' ? 'success' : 'warning'}>
              {currentVersion.status === 'published' ? '已发布' : currentVersion.status === 'draft' ? '草稿' : '已归档'}
            </Badge>
            <Link to="/prompts">
              <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>
                返回
              </Button>
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Editor */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">模板编辑器</h3>
              <Badge variant="neutral">{currentVersion.version}</Badge>
            </div>
            <textarea
              className="w-full min-h-[300px] p-4 rounded-lg border text-sm font-mono leading-relaxed resize-y"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2 text-xs text-secondary">
              <span>{template.length} 字符 · 约 {Math.ceil(template.length / 4)} Tokens</span>
              <button
                className="text-brand-main hover:underline flex items-center gap-1"
                onClick={() => handleCopy(template)}
              >
                <Copy size={12} /> 复制模板
              </button>
            </div>
          </Card>

          {/* Variables */}
          <Card>
            <h3 className="font-bold mb-4">变量填槽</h3>
            <div className="space-y-4">
              {Object.entries(variables).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-secondary uppercase mb-1.5">
                    {key}
                  </label>
                  {key === 'code' ? (
                    <textarea
                      className="w-full h-32 p-3 rounded-lg border text-sm font-mono leading-relaxed resize-y"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
                      value={value}
                      onChange={(e) => updateVariable(key, e.target.value)}
                    />
                  ) : (
                    <Input
                      value={value}
                      onChange={(e) => updateVariable(key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">渲染预览</h3>
              <Button
                variant="secondary"
                size="sm"
                icon={<Play size={14} />}
                onClick={handleRunSandbox}
              >
                沙箱测试
              </Button>
            </div>
            <div
              className="p-4 rounded-lg border text-sm font-mono leading-relaxed whitespace-pre-wrap min-h-[200px]"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
            >
              {renderedTemplate}
            </div>
          </Card>
        </div>
      )}

      {/* Sandbox Tab */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-bold mb-4">沙箱配置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  测试模型
                </label>
                <select
                  className="input"
                  value={sandboxModel}
                  onChange={(e) => setSandboxModel(e.target.value)}
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="deepseek-coder">DeepSeek Coder</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  温度 (Temperature)
                </label>
                <Input type="number" value="0.7" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  最大 Tokens
                </label>
                <Input type="number" value="2048" />
              </div>

              <Button
                className="w-full"
                loading={sandboxLoading}
                onClick={handleRunSandbox}
                icon={<Play size={16} />}
              >
                运行沙箱测试
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold mb-4">测试结果</h3>
            {sandboxResult ? (
              <div
                className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
              >
                {sandboxResult}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-secondary text-sm">
                点击「运行沙箱测试」查看结果
              </div>
            )}
          </Card>
        </div>
      )}

      {/* A/B Test Tab */}
      {activeTab === 'ab-test' && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-bold mb-4">A/B 测试配置</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  模型 A
                </label>
                <select className="input" value={abModelA} onChange={(e) => setAbModelA(e.target.value)}>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  模型 B
                </label>
                <select className="input" value={abModelB} onChange={(e) => setAbModelB(e.target.value)}>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" loading={abLoading} onClick={handleRunAB} icon={<Play size={16} />}>
                  运行 A/B 对比
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">模型 A: {abModelA}</h3>
                {abResultA && <Badge variant="success">完成</Badge>}
              </div>
              {abResultA ? (
                <div
                  className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  {abResultA}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-secondary text-sm">
                  等待运行...
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">模型 B: {abModelB}</h3>
                {abResultB && <Badge variant="success">完成</Badge>}
              </div>
              {abResultB ? (
                <div
                  className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  {abResultB}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-secondary text-sm">
                  等待运行...
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">版本历史</h3>
              <Button variant="secondary" size="sm" icon={<GitBranch size={14} />}>
                创建新版本
              </Button>
            </div>
            <div className="space-y-4">
              {MOCK_VERSIONS.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedVersionId === version.id ? 'border-brand-main' : ''
                  }`}
                  style={{
                    borderColor: selectedVersionId === version.id ? 'var(--brand-main)' : 'var(--border-color)',
                    backgroundColor: selectedVersionId === version.id ? 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))' : 'transparent',
                  }}
                  onClick={() => {
                    setSelectedVersionId(version.id)
                    setTemplate(version.template)
                    setVariables(version.variables)
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={version.status === 'published' ? 'success' : 'neutral'}>
                        {version.version}
                      </Badge>
                      {version.status === 'published' && <Badge variant="success">当前线上</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <User size={12} />
                      <span>{version.author}</span>
                      <Clock size={12} />
                      <span>{version.createdAt}</span>
                    </div>
                  </div>
                  <p className="text-sm mb-2">{version.changes}</p>
                  {version.stats && (
                    <div className="flex gap-4 text-xs text-secondary">
                      <span>调用: {version.stats.calls.toLocaleString()}</span>
                      <span>平均 Tokens: {version.stats.avgTokens}</span>
                      <span>平均延迟: {version.stats.avgLatency}ms</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Draft */}
          <Card style={{ borderColor: 'var(--warning)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Badge variant="warning">草稿</Badge>
                <h3 className="font-bold">未发布修改</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />}>
                  放弃修改
                </Button>
                <Button size="sm" icon={<Send size={14} />}>
                  提交审核
                </Button>
              </div>
            </div>
            <p className="text-sm text-secondary mb-2">{MOCK_DRAFT.changes}</p>
            <div className="text-xs text-secondary">
              修改人: {MOCK_DRAFT.author} · 修改时间: {MOCK_DRAFT.createdAt}
            </div>
          </Card>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-brand-main" />
              <span className="text-xs text-secondary">总调用次数</span>
            </div>
            <div className="text-2xl font-bold">49,420</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-brand-main" />
              <span className="text-xs text-secondary">平均 Tokens</span>
            </div>
            <div className="text-2xl font-bold">450</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-brand-main" />
              <span className="text-xs text-secondary">平均延迟</span>
            </div>
            <div className="text-2xl font-bold">1.1s</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-brand-main" />
              <span className="text-xs text-secondary">成功率</span>
            </div>
            <div className="text-2xl font-bold">99.8%</div>
          </Card>
        </div>
      )}
    </div>
  )
}
