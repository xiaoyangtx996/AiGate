import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Save, BookOpen, Wrench } from 'lucide-react'

const LLM_MODELS = ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-coder'] as const

const KNOWLEDGE_BASES = [
  { id: 'kb-1', label: '数据库优化 SLA 手册', checked: true },
  { id: 'kb-2', label: '新版上线压测参数集', checked: false },
]

const MCP_TOOLS = [
  { id: 'mcp-1', label: 'Mysql-Query-MCP', checked: true },
  { id: 'mcp-2', label: 'Slack-Alerts-MCP', checked: false },
]

export default function AgentCreate() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [model, setModel] = useState<(typeof LLM_MODELS)[number]>(LLM_MODELS[0])
  const [systemInstructions, setSystemInstructions] = useState('')
  const [knowledgeBases, setKnowledgeBases] = useState(KNOWLEDGE_BASES)
  const [mcpTools, setMcpTools] = useState(MCP_TOOLS)

  const handleSubmit = () => {
    if (!name.trim() || !systemInstructions.trim()) {
      alert('请填写智能体名称与设定指令！')
      return
    }

    const selectedKb = knowledgeBases.filter((kb) => kb.checked).length
    const selectedMcp = mcpTools.filter((mcp) => mcp.checked).length

    alert(
      `[成功] 智能体「${name}」已编排发布成功！\n自动激活挂载了 ${selectedKb} 个知识库与 ${selectedMcp} 个 MCP 工具。`,
    )
    navigate('/agent')
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
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/agent')}
          >
            返回
          </Button>
        }
      />

      <Card className="max-w-3xl mx-auto p-8 space-y-6">
        {/* Form Fields */}
        <div className="space-y-5">
          {/* Name & Model Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                智能体名称 (Agent Name)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：数据库 SQL 调优助理"
                className="input"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                底层推理大模型 (LLM Model)
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as (typeof LLM_MODELS)[number])}
                className="input"
              >
                {LLM_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* System Instructions */}
          <div>
            <label className="text-xs font-bold uppercase block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              系统设定指令 (System Instructions)
            </label>
            <textarea
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              placeholder="你是一个经验丰富的 SQL 调优专家..."
              rows={5}
              className="input text-xs font-mono leading-relaxed resize-y"
            />
          </div>

          {/* Knowledge Base & MCP Tools Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Knowledge Base Mounting */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <BookOpen className="w-3.5 h-3.5" />
                挂载隔离知识库 (RAG KB)
              </label>
              <div
                className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {knowledgeBases.map((kb) => (
                  <label
                    key={kb.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={kb.checked}
                      onChange={(e) =>
                        setKnowledgeBases((prev) =>
                          prev.map((item) =>
                            item.id === kb.id ? { ...item, checked: e.target.checked } : item,
                          ),
                        )
                      }
                      className="accent-[var(--brand-main)]"
                    />
                    {kb.label}
                  </label>
                ))}
              </div>
            </div>

            {/* MCP Tool Mounting */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Wrench className="w-3.5 h-3.5" />
                集成外部 MCP 工具接口
              </label>
              <div
                className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {mcpTools.map((mcp) => (
                  <label
                    key={mcp.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={mcp.checked}
                      onChange={(e) =>
                        setMcpTools((prev) =>
                          prev.map((item) =>
                            item.id === mcp.id ? { ...item, checked: e.target.checked } : item,
                          ),
                        )
                      }
                      className="accent-[var(--brand-main)]"
                    />
                    {mcp.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" size="sm" onClick={() => navigate('/agent')}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSubmit}
          >
            立即保存并发布
          </Button>
        </div>
      </Card>
    </div>
  )
}
