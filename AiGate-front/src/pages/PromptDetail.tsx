import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  Send,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface PromptVersion {
  value: string
  label: string
  variables: {
    language: string
    focusArea: string
    code: string
  }
}

const versions: PromptVersion[] = [
  {
    value: 'v2.1.0',
    label: 'v2.1.0 (当前线上 · 2026-05-17)',
    variables: {
      language: 'Javascript',
      focusArea: '内存溢出与回调陷阱',
      code: `function execute() {\n  for(let i=0; i<10000; i++) {\n    setTimeout(() => {\n      console.log(i);\n    }, 100);\n  }\n}`,
    },
  },
  {
    value: 'v2.0.0',
    label: 'v2.0.0 (历史归档 · 2026-04-12)',
    variables: {
      language: 'Python',
      focusArea: '类型注解与列表推导式性能',
      code: `def parse(items):\n  return [x * 2 for x in items]`,
    },
  },
]

const template = `请用专业的语气审查以下 {{language}} 代码，重点关注 {{focus_area}}：\n\n{{code}}`

const sandboxModels = [
  'gpt-4o (企业首选模型)',
  'claude-3-5-sonnet',
]

function renderTemplate(language: string, focusArea: string, code: string): string {
  return template
    .replace('{{language}}', language)
    .replace('{{focus_area}}', focusArea)
    .replace('{{code}}', code)
}

export default function PromptDetail() {
  const [selectedVersion, setSelectedVersion] = useState('v2.1.0')
  const [language, setLanguage] = useState(versions[0].variables.language)
  const [focusArea, setFocusArea] = useState(versions[0].variables.focusArea)
  const [code, setCode] = useState(versions[0].variables.code)
  const [sandboxModel, setSandboxModel] = useState(sandboxModels[0])
  const [sandboxResult, setSandboxResult] = useState<string | null>(null)
  const [sandboxLoading, setSandboxLoading] = useState(false)

  // AiGate Bot chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    { role: 'bot' | 'user'; text: string }[]
  >([
    {
      role: 'bot',
      text: '你好！我是 AiGate Bot，可以帮你查询配额、调用日志，或根据选定知识库回答问题。',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatKb, setChatKb] = useState('全局 (不限知识库)')
  const [chatModel, setChatModel] = useState('gpt-4o')

  const renderedOutput = renderTemplate(language, focusArea, code)

  const handleVersionChange = useCallback((version: string) => {
    setSelectedVersion(version)
    const found = versions.find((v) => v.value === version)
    if (found) {
      setLanguage(found.variables.language)
      setFocusArea(found.variables.focusArea)
      setCode(found.variables.code)
    }
  }, [])

  const handleRunSandbox = () => {
    setSandboxLoading(true)
    setSandboxResult(null)
    setTimeout(() => {
      setSandboxResult(
        `[代码审查意见 - gpt-4o v2.1.0]\n\n这段代码存在典型的内存溢出（Memory Leak）隐患：\n1. **闭包/回调陷阱**：在循环中创建了 10,000 个 setTimeout 回调函数，所有回调函数保持了对局部变量 i 的引用闭包，这会导致 JS 引擎的宏任务队列瞬间暴涨。\n2. **性能优化建议**：若仅做周期性的批量异步消费，应避免瞬时创建庞大的宏任务队列。建议采用批处理（Batching）或 async/await 队列排队处理。`
      )
      setSandboxLoading(false)
    }, 1000)
  }

  const handleSendChat = () => {
    const msg = chatInput.trim()
    if (!msg) return
    setChatMessages((prev) => [...prev, { role: 'user', text: msg }])
    setChatInput('')
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { role: 'bot', text: '[演示] 已收到您的问题，正在检索知识库并生成回答...' },
      ])
    }, 800)
  }

  return (
    <div>
      <PageHeader
        title="提示词资产调试中心"
        subtitle="编辑提示词版本，填槽调试，进行 A/B 真实测试与安全风险拦截审计。"
        breadcrumbs={[
          { label: 'AI 资产市场' },
          { label: '提示词库', path: '/prompts' },
          { label: '调试中心' },
        ]}
        actions={
          <Link
            to="/prompts"
            className="text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left control panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Version control */}
          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
                版本控制
              </h3>
              <Badge variant="success">已发布</Badge>
            </div>
            <div className="space-y-2">
              <select
                className="input-base text-xs font-mono font-bold"
                value={selectedVersion}
                onChange={(e) => handleVersionChange(e.target.value)}
              >
                {versions.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-secondary leading-relaxed">
                提示词作为企业级资产，每次修改都将生成新版本，必须审核发布方可供网关消费。
              </p>
            </div>
          </Card>

          {/* Variable sandbox */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              调试槽变量填入 (Variables Sandbox)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  language (编程语言)
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  focus_area (关注重点)
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  code (源代码片段)
                </label>
                <textarea
                  className="input-base text-xs h-24 p-3 font-mono leading-relaxed"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right debug panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rendered output */}
          <Card className="flex flex-col min-h-[300px] p-5">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-secondary">
              渲染组合提示词 (Rendered Output)
            </h3>
            <textarea
              className="w-full flex-grow p-4 rounded-lg border text-xs font-mono leading-relaxed resize-none focus:outline-none"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
              value={renderedOutput}
              readOnly
            />
          </Card>

          {/* Sandbox model test */}
          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
                沙箱大模型联调
              </h3>
              <select
                className="input-base text-xs w-48"
                value={sandboxModel}
                onChange={(e) => setSandboxModel(e.target.value)}
              >
                {sandboxModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full py-3 font-bold text-sm"
              size="lg"
              loading={sandboxLoading}
              onClick={handleRunSandbox}
            >
              发送并模拟推理响应
            </Button>
            {sandboxResult && (
              <div className="space-y-2 mt-4">
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
                  模型响应 (Response Payload)
                </label>
                <div
                  className="p-4 rounded-lg border text-xs font-mono leading-relaxed whitespace-pre-wrap"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {sandboxResult}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Floating AI chat bot */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-13 h-13 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform"
          style={{
            background: 'var(--brand-main)',
            color: 'var(--bg-body)',
            width: 52,
            height: 52,
          }}
        >
          <Bot size={26} />
        </button>
      </div>

      {chatOpen && (
        <div
          className="fixed bottom-24 right-8 z-50 w-[380px] h-[520px] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Chat header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
          >
            <div className="flex items-center gap-2.5">
              <Bot size={20} />
              <div>
                <div className="font-bold text-sm">AiGate Bot</div>
                <div className="text-xs opacity-80">选择知识库开始对话</div>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="bg-transparent border-none cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--bg-body)' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat KB/model selectors */}
          <div
            className="flex gap-2 items-center px-4 py-3"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <select
              className="flex-1 input-base text-xs"
              value={chatKb}
              onChange={(e) => setChatKb(e.target.value)}
            >
              <option>全局 (不限知识库)</option>
              <option>产品设计文档</option>
              <option>SLA 运维手册</option>
            </select>
            <select
              className="input-base text-xs w-36"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
            >
              <option>gpt-4o</option>
              <option>claude-3-5-sonnet</option>
            </select>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-2.5 items-start'}`}
              >
                {msg.role === 'bot' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--brand-main)' }}
                  >
                    <Bot size={14} style={{ color: 'var(--bg-body)' }} />
                  </div>
                )}
                <div
                  className="text-[13px] max-w-[80%] leading-relaxed"
                  style={{
                    background:
                      msg.role === 'user'
                        ? 'var(--brand-main)'
                        : 'var(--bg-body)',
                    color:
                      msg.role === 'user'
                        ? 'var(--bg-body)'
                        : 'var(--text-primary)',
                    border:
                      msg.role === 'bot'
                        ? '1px solid var(--border-color)'
                        : 'none',
                    borderRadius:
                      msg.role === 'user'
                        ? '12px 0 12px 12px'
                        : '0 12px 12px 12px',
                    padding: '10px 14px',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div
            className="flex gap-2 p-3"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <input
              type="text"
              placeholder="输入问题，按 Enter 发送..."
              className="flex-1 input-base text-sm"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            />
            <Button size="sm" onClick={handleSendChat}>
              <Send size={14} className="mr-1" />
              发送
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
