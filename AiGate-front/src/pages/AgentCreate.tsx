import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Stepper } from '@/components/ui/Stepper'
import { useUIStore } from '@/stores/ui'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  BookOpen,
  Wrench,
  Users,
  Bot,
  Check,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 'basic', title: '基础信息', description: '名称、模型、提示词' },
  { id: 'knowledge', title: '知识库绑定', description: '挂载私有知识库' },
  { id: 'tools', title: 'MCP 工具', description: '集成外部工具' },
  { id: 'users', title: '使用者授权', description: '配置访问权限' },
]

const LLM_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'OpenAI 旗舰模型，多模态' },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', description: 'Anthropic 高性能模型' },
  { value: 'deepseek-coder', label: 'DeepSeek Coder', description: '代码专用模型' },
  { value: 'gemini-pro', label: 'Gemini Pro', description: 'Google 多模态模型' },
]

const KNOWLEDGE_BASES = [
  { id: 'kb-1', name: '数据库优化 SLA 手册', docs: 12, tokens: '45K', selected: true },
  { id: 'kb-2', name: '新版上线压测参数集', docs: 8, tokens: '28K', selected: false },
  { id: 'kb-3', name: 'API 接口设计规范', docs: 25, tokens: '92K', selected: false },
  { id: 'kb-4', name: '故障排查手册', docs: 18, tokens: '65K', selected: false },
]

const MCP_TOOLS = [
  { id: 'mcp-1', name: 'MySQL-Query-MCP', description: '数据库查询工具', category: '数据', selected: true },
  { id: 'mcp-2', name: 'Slack-Alerts-MCP', description: 'Slack 通知工具', category: '通讯', selected: false },
  { id: 'mcp-3', name: 'GitHub-API-MCP', description: 'GitHub 操作工具', category: '开发', selected: false },
  { id: 'mcp-4', name: 'Jira-MCP', description: '项目管理工具', category: '协作', selected: false },
]

const TEAM_MEMBERS = [
  { id: 'u-1', name: '张三', role: '部门负责人', selected: true },
  { id: 'u-2', name: '李四', role: '高级工程师', selected: true },
  { id: 'u-3', name: '王五', role: '工程师', selected: true },
  { id: 'u-4', name: '赵六', role: '初级工程师', selected: false },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AgentCreate() {
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1: Basic Info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState(LLM_MODELS[0].value)
  const [systemPrompt, setSystemPrompt] = useState('')

  // Step 2: Knowledge
  const [knowledgeBases, setKnowledgeBases] = useState(KNOWLEDGE_BASES)
  const [topK, setTopK] = useState(5)

  // Step 3: Tools
  const [mcpTools, setMcpTools] = useState(MCP_TOOLS)
  const [toolBudget, setToolBudget] = useState(1000)

  // Step 4: Users
  const [members, setMembers] = useState(TEAM_MEMBERS)
  const [quotaLimit, setQuotaLimit] = useState(10000)
  const [accessScope, setAccessScope] = useState<'project' | 'department' | 'all'>('project')

  // Navigation
  const canNext = () => {
    switch (currentStep) {
      case 0:
        return name.trim() && systemPrompt.trim()
      case 1:
        return knowledgeBases.some((kb) => kb.selected)
      case 2:
        return true
      case 3:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // 表单验证
    if (!name.trim()) {
      addToast({ type: 'error', title: '验证失败', message: '请填写智能体名称' })
      return
    }
    if (!systemPrompt.trim()) {
      addToast({ type: 'error', title: '验证失败', message: '请填写系统设定指令' })
      return
    }
    if (name.trim().length < 2) {
      addToast({ type: 'error', title: '验证失败', message: '智能体名称至少需要 2 个字符' })
      return
    }
    if (systemPrompt.trim().length < 10) {
      addToast({ type: 'error', title: '验证失败', message: '系统设定指令至少需要 10 个字符' })
      return
    }

    const selectedKb = knowledgeBases.filter((kb) => kb.selected).length
    const selectedMcp = mcpTools.filter((mcp) => mcp.selected).length
    const selectedMembers = members.filter((m) => m.selected).length

    addToast({
      type: 'success',
      title: '创建成功',
      message: `智能体「${name}」已创建，挂载 ${selectedKb} 个知识库、${selectedMcp} 个工具，授权 ${selectedMembers} 人`,
    })
    navigate('/agent')
  }

  // Toggle selections
  const toggleKnowledge = (id: string) => {
    setKnowledgeBases((prev) => prev.map((kb) => (kb.id === id ? { ...kb, selected: !kb.selected } : kb)))
  }

  const toggleTool = (id: string) => {
    setMcpTools((prev) => prev.map((tool) => (tool.id === id ? { ...tool, selected: !tool.selected } : tool)))
  }

  const toggleMember = (id: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)))
  }

  const toggleAllMembers = () => {
    const allSelected = members.every((m) => m.selected)
    setMembers((prev) => prev.map((m) => ({ ...m, selected: !allSelected })))
  }

  return (
    <div>
      <PageHeader
        title="创建全新智能体"
        subtitle="编排提示指令，挂载私有知识库与 MCP 开发工具，提供定制化的专家工作流能力。"
        breadcrumbs={[
          { label: 'Agent 中心', path: '/agent' },
          { label: '创建智能体' },
        ]}
        actions={
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/agent')}>
            返回
          </Button>
        }
      />

      {/* Stepper */}
      <Card className="mb-6">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </Card>

      {/* Step Content */}
      <Card className="max-w-3xl mx-auto p-8">
        {/* Step 1: Basic Info */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={20} className="text-brand-main" />
              <h3 className="text-lg font-bold">基础信息</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="智能体名称"
                placeholder="例如：数据库 SQL 调优助理"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="w-full">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  底层推理模型 <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {LLM_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} - {m.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="简介"
              placeholder="一句话描述这个智能体的用途"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                系统设定指令 <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input min-h-[200px] font-mono text-sm leading-relaxed"
                placeholder="你是一个经验丰富的 SQL 调优专家，擅长分析慢查询并提供优化建议..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
              <p className="text-xs text-secondary mt-1">
                {systemPrompt.length} 字符 · 约 {Math.ceil(systemPrompt.length / 4)} Tokens
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Knowledge Base */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={20} className="text-brand-main" />
              <h3 className="text-lg font-bold">知识库绑定</h3>
            </div>

            <p className="text-sm text-secondary">
              选择要挂载的知识库，Agent 将在回答时检索这些知识库中的文档。
            </p>

            <div className="space-y-3">
              {knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    kb.selected ? 'border-brand-main' : ''
                  }`}
                  style={{
                    borderColor: kb.selected ? 'var(--brand-main)' : 'var(--border-color)',
                    backgroundColor: kb.selected ? 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))' : 'transparent',
                  }}
                  onClick={() => toggleKnowledge(kb.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={kb.selected}
                        onChange={() => toggleKnowledge(kb.id)}
                        className="accent-[var(--brand-main)]"
                      />
                      <div>
                        <div className="font-medium">{kb.name}</div>
                        <div className="text-xs text-secondary mt-1">
                          {kb.docs} 个文档 · {kb.tokens} Tokens
                        </div>
                      </div>
                    </div>
                    {kb.selected && (
                      <Badge variant="success">已选择</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <Input
                label="Top-K 检索数量"
                type="number"
                value={topK.toString()}
                onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                helperText="每次检索返回的最大文档片段数"
              />
            </div>
          </div>
        )}

        {/* Step 3: MCP Tools */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={20} className="text-brand-main" />
              <h3 className="text-lg font-bold">MCP 工具授权</h3>
            </div>

            <p className="text-sm text-secondary">
              选择要授权给 Agent 的 MCP 工具，Agent 可以在对话中调用这些工具。
            </p>

            <div className="space-y-3">
              {mcpTools.map((tool) => (
                <div
                  key={tool.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    tool.selected ? 'border-brand-main' : ''
                  }`}
                  style={{
                    borderColor: tool.selected ? 'var(--brand-main)' : 'var(--border-color)',
                    backgroundColor: tool.selected ? 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))' : 'transparent',
                  }}
                  onClick={() => toggleTool(tool.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={tool.selected}
                        onChange={() => toggleTool(tool.id)}
                        className="accent-[var(--brand-main)]"
                      />
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-xs text-secondary mt-1">{tool.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{tool.category}</Badge>
                      {tool.selected && <Badge variant="success">已授权</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Input
              label="工具调用预算上限"
              type="number"
              value={toolBudget.toString()}
              onChange={(e) => setToolBudget(parseInt(e.target.value) || 1000)}
              helperText="每月工具调用次数上限"
            />
          </div>
        )}

        {/* Step 4: User Authorization */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-brand-main" />
              <h3 className="text-lg font-bold">使用者授权</h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                访问范围
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'project', label: '项目成员' },
                  { value: 'department', label: '部门成员' },
                  { value: 'all', label: '全员' },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      accessScope === option.value ? 'border-brand-main text-brand-main' : ''
                    }`}
                    style={{
                      borderColor: accessScope === option.value ? 'var(--brand-main)' : 'var(--border-color)',
                      backgroundColor: accessScope === option.value ? 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))' : 'transparent',
                    }}
                    onClick={() => setAccessScope(option.value as typeof accessScope)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  授权成员
                </label>
                <button
                  className="text-xs text-brand-main hover:underline"
                  onClick={toggleAllMembers}
                >
                  {members.every((m) => m.selected) ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--border-color)' }}
                    onClick={() => toggleMember(member.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={member.selected}
                        onChange={() => toggleMember(member.id)}
                        className="accent-[var(--brand-main)]"
                      />
                      <div>
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-secondary">{member.role}</div>
                      </div>
                    </div>
                    {member.selected && <Check size={16} className="text-brand-main" />}
                  </div>
                ))}
              </div>
            </div>

            <Input
              label="调用配额上限"
              type="number"
              value={quotaLimit.toString()}
              onChange={(e) => setQuotaLimit(parseInt(e.target.value) || 10000)}
              helperText="每人每月最大调用次数"
            />

            {/* Summary */}
            <Card
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))',
                borderColor: 'var(--brand-main)',
              }}
            >
              <h4 className="font-bold mb-3">创建摘要</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">智能体名称</span>
                  <span className="font-medium">{name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">推理模型</span>
                  <span>{LLM_MODELS.find((m) => m.value === model)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">挂载知识库</span>
                  <span>{knowledgeBases.filter((kb) => kb.selected).length} 个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">授权工具</span>
                  <span>{mcpTools.filter((t) => t.selected).length} 个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">授权成员</span>
                  <span>{members.filter((m) => m.selected).length} 人</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-6 mt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button
            variant="secondary"
            onClick={handlePrev}
            disabled={currentStep === 0}
            icon={<ArrowLeft size={16} />}
          >
            上一步
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/agent')}>
              取消
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canNext()}
                icon={<ArrowRight size={16} />}
              >
                下一步
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canNext()}
                icon={<Save size={16} />}
              >
                创建并发布
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
