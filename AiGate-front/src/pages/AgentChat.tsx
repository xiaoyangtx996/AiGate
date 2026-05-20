import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Bot, X } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const agentAssets = [
  { label: 'Mysql-MCP', variant: 'neutral' as const },
  { label: 'Milvus-KB', variant: 'success' as const },
  { label: 'Prompt-AB', variant: 'neutral' as const },
]

const botWelcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '你好！我是您的 SQL 调优助理。请把您的慢查询语句发送给我，我将帮您进行语法调优并测试索引命中。',
}

const botReply: ChatMessage = {
  id: 'reply',
  role: 'assistant',
  content: `[SQL 调优诊断书]

诊断结果：
您的 SQL 存在全局全表扫描风险。age > 20 未命中覆盖索引。

优化建议：
建议为 users 表增加复合索引：
ALTER TABLE users ADD INDEX idx_age_status (age, status);`,
}

const thinkingSteps = [
  '正在调起 Milvus 向量库检索相关 SLA 调优标准...',
  '成功检索到 2 个相关索引策略。正在通过 Mysql-MCP 工具联查 Explain 结构...',
  '大模型 gpt-4o 正在组合推理与改写建议...',
]

/* ------------------------------------------------------------------ */
/*  Floating Chat Panel                                                */
/* ------------------------------------------------------------------ */

function FloatingChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'fc-welcome',
      role: 'assistant',
      content:
        '你好！我是 AiGate Bot，可以帮你查询配额、调用日志，或根据选定知识库回答问题。',
    },
  ])
  const [input, setInput] = useState('')
  const [knowledgeBase, setKnowledgeBase] = useState('全局 (不限知识库)')
  const [model, setModel] = useState('gpt-4o')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      { id: `fc-u-${Date.now()}`, role: 'user', content: text },
    ])
    setInput('')
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `fc-a-${Date.now()}`,
          role: 'assistant',
          content: '[演示] 已收到您的问题，正在检索知识库并生成回答...',
        },
      ])
    }, 800)
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-8 right-8 z-50 w-13 h-13 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
        style={{
          background: 'var(--brand-main)',
          color: 'var(--bg-body)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}
        aria-label="打开 AiGate Bot"
      >
        <Bot size={26} />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-8 z-50 w-[380px] h-[520px] rounded-2xl overflow-hidden flex flex-col"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: 'var(--brand-main)' }}
          >
            <div className="flex items-center gap-2.5" style={{ color: 'var(--bg-body)' }}>
              <Bot size={20} />
              <div>
                <div className="font-bold text-sm">AiGate Bot</div>
                <div className="text-[11px] opacity-80">选择知识库开始对话</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--bg-body)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>

          {/* Selectors */}
          <div
            className="px-4 py-3 flex gap-2 items-center"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <select
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              className="flex-1 input-base text-xs"
            >
              <option>全局 (不限知识库)</option>
              <option>产品设计文档</option>
              <option>SLA 运维手册</option>
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input-base text-xs"
            >
              <option>gpt-4o</option>
              <option>claude-3-5-sonnet</option>
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={msg.role === 'user' ? 'flex justify-end' : 'flex gap-2.5 items-start'}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
                  >
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className="text-[13px] max-w-[80%] leading-relaxed"
                  style={{
                    background:
                      msg.role === 'user' ? 'var(--brand-main)' : 'var(--bg-body)',
                    color: msg.role === 'user' ? 'var(--bg-body)' : 'var(--text-primary)',
                    border:
                      msg.role === 'assistant'
                        ? '1px solid var(--border-color)'
                        : 'none',
                    borderRadius:
                      msg.role === 'user'
                        ? '12px 0 12px 12px'
                        : '0 12px 12px 12px',
                    padding: '10px 14px',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3 flex gap-2"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入问题，按 Enter 发送..."
              className="input-base flex-1 text-[13px] py-2.5 px-3.5"
            />
            <button
              onClick={handleSend}
              className="btn-primary px-4 font-bold text-[13px]"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([botWelcome])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [thinkingText, setThinkingText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinkingText])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: text },
    ])
    setInput('')

    // Show thinking steps
    setThinking(true)
    setThinkingText(thinkingSteps[0])

    setTimeout(() => {
      setThinkingText(thinkingSteps[1])
      setTimeout(() => {
        setThinkingText(thinkingSteps[2])
        setTimeout(() => {
          setThinking(false)
          setMessages((prev) => [
            ...prev,
            { ...botReply, id: `a-${Date.now()}` },
          ])
        }, 800)
      }, 800)
    }, 800)
  }

  return (
    <div>
      {/* ============================================================ */}
      {/*  Page Header                                                 */}
      {/* ============================================================ */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/agent"
          className="text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SQL 调优助理</h1>
          <p className="text-secondary text-xs mt-0.5">
            底座模型: gpt-4o &middot; 状态: 挂载了 Milvus 向量库及数据库 MCP 工具
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Chat Grid                                                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[580px] overflow-hidden">
        {/* ---- Left: Agent Info Panel ---- */}
        <Card className="lg:col-span-1 p-5 space-y-4 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-4">
            {/* Agent Identity */}
            <div
              className="text-center pb-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div
                className="w-12 h-12 rounded-xl font-bold flex items-center justify-center mx-auto mb-2"
                style={{
                  background: 'color-mix(in srgb, var(--brand-main) 10%, transparent)',
                  color: 'var(--brand-main)',
                }}
              >
                <Bot size={24} />
              </div>
              <div className="font-bold text-sm">数据库调优专家</div>
              <div className="text-xs text-secondary mt-1">
                专职生产环境 SQL 慢查询拦截与索引治理。
              </div>
            </div>

            {/* Dependency Assets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary uppercase block">
                当前启用的依赖资产
              </label>
              <div className="flex flex-wrap gap-1.5">
                {agentAssets.map((asset) => (
                  <Badge key={asset.label} variant={asset.variant} className="font-mono text-[10px]">
                    {asset.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Gateway Status */}
          <div
            className="p-3 rounded-lg border text-xs text-secondary leading-relaxed"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
          >
            [网关状态监控]
            <br />
            推理成功率: 100%
            <br />
            平均 RAG 消耗: 18ms
          </div>
        </Card>

        {/* ---- Right: Chat Area ---- */}
        <div
          className="lg:col-span-3 card p-0 flex flex-col justify-between h-full relative"
          style={{ background: 'var(--bg-surface)' }}
        >
          {/* Messages */}
          <div className="flex-grow p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
                  >
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className="text-sm max-w-[80%] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background:
                      msg.role === 'user'
                        ? 'color-mix(in srgb, var(--brand-main) 10%, transparent)'
                        : 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius:
                      msg.role === 'user'
                        ? '12px 0 12px 12px'
                        : '0 12px 12px 12px',
                    padding: '12px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    我
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Thinking Log */}
          {thinking && (
            <div
              className="px-6 py-2 border-t border-b text-xs font-mono text-secondary space-y-1"
              style={{
                background: 'var(--bg-elevated)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ background: 'var(--brand-main)' }}
                />
                <span>{thinkingText}</span>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div
            className="p-4 border-t flex gap-3"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入您的 SQL 查询语句，例如：SELECT * FROM users WHERE age > 20..."
              className="input-base flex-grow text-sm py-3 px-4 focus:outline-none"
            />
            <button onClick={handleSend} className="btn-primary px-6 font-bold text-sm">
              发 送
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Floating AiGate Bot Chat                                    */}
      {/* ============================================================ */}
      <FloatingChatPanel />
    </div>
  )
}
