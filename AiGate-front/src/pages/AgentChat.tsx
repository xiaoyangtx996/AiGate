import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  Bot,
  X,
  ChevronDown,
  Wrench,
  BookOpen,
  Send,
  Sparkles,
  Copy,
  Check,
  User,
  Clock,
  Zap,
  FileText,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ToolCallStep {
  id: string
  toolName: string
  toolIcon: string
  status: 'running' | 'success' | 'error'
  summary: string
  detail?: string
  duration?: string
}

interface CitationSource {
  id: string
  docName: string
  pageOrSection: string
  similarity: number
  snippet: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallStep[]
  citations?: CitationSource[]
  isStreaming?: boolean
  timestamp?: string
}

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const agentAssets = [
  { label: 'Mysql-MCP', variant: 'neutral' as const },
  { label: 'Milvus-KB', variant: 'success' as const },
  { label: 'Prompt-AB', variant: 'neutral' as const },
]

const quickTemplates = [
  '上周用量最多的 3 个部门',
  '当前有多少异常密钥',
  '本月预计什么时候配额用尽',
  '销售部本月费用明细',
]

const botWelcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '你好！我是您的 SQL 调优助理，挂载了 Milvus 向量库及 Mysql-MCP 工具。请把您的慢查询语句发送给我，我将帮您进行语法调优并测试索引命中。',
  timestamp: '14:00',
}

const mockToolCalls: ToolCallStep[] = [
  {
    id: 'tc-1',
    toolName: 'Milvus-KB',
    toolIcon: 'BookOpen',
    status: 'success',
    summary: '向量检索 SLA 调优标准',
    detail: '检索关键词: "SQL 全表扫描 索引优化"\n返回 Top-2 相似文档，相似度: 0.92 / 0.87',
    duration: '18ms',
  },
  {
    id: 'tc-2',
    toolName: 'Mysql-MCP',
    toolIcon: 'Wrench',
    status: 'success',
    summary: '联查 Explain 执行计划',
    detail: '执行: EXPLAIN SELECT * FROM users WHERE age > 20\n结果: type=ALL, rows=58240, Extra=Using where\n未命中任何索引，判定全表扫描',
    duration: '45ms',
  },
  {
    id: 'tc-3',
    toolName: 'gpt-4o',
    toolIcon: 'Sparkles',
    status: 'success',
    summary: '大模型组合推理与改写',
    detail: '输入: 检索结果 + EXPLAIN 输出 + 用户原始 SQL\n推理策略: 复合索引推荐 + 查询改写\n输出: 优化 SQL + 索引 DDL + 预估收益',
    duration: '1,240ms',
  },
]

const mockCitations: CitationSource[] = [
  {
    id: 'cite-1',
    docName: 'SLA 运维手册 v3.2',
    pageOrSection: '第 4 章 - 索引治理规范',
    similarity: 0.92,
    snippet:
      '对于范围查询（BETWEEN / > / <），建议将等值条件列放在复合索引最左前缀，范围列放最后...',
  },
  {
    id: 'cite-2',
    docName: 'MySQL 性能优化最佳实践',
    pageOrSection: '第 12 页 - 覆盖索引策略',
    similarity: 0.87,
    snippet:
      '当 EXPLAIN 的 Extra 列出现 "Using index" 时，表示查询完全由索引覆盖，无需回表...',
  },
  {
    id: 'cite-3',
    docName: '生产环境慢查询治理方案',
    pageOrSection: '附录 B - 常见索引模式',
    similarity: 0.81,
    snippet:
      'users 表高频查询模式统计: age+status 组合查询占比 34%，建议优先建立复合索引...',
  },
]

const botReplyContent = `[SQL 调优诊断书]

诊断结果：
您的 SQL 存在全局全表扫描风险。EXPLAIN 显示 type=ALL，扫描行数 58,240。age > 20 条件未命中任何索引，导致数据库逐行过滤。

优化建议：
1. 为 users 表增加复合索引：

\`\`\`sql
ALTER TABLE users ADD INDEX idx_age_status (age, status);
\`\`\`

2. 改写查询以利用覆盖索引：

\`\`\`sql
SELECT id, name, age, status
FROM users
WHERE age > 20 AND status = 'active';
\`\`\`

预估收益：
- 索引命中后扫描行数从 58,240 降至约 120 行
- 查询耗时预计从 320ms 降至 5ms 以内
- 建议在业务低峰期执行 DDL，避免锁表影响线上服务`

/* ------------------------------------------------------------------ */
/*  Streaming Hook                                                     */
/* ------------------------------------------------------------------ */

function useTypewriter(text: string, speed: number = 12, enabled: boolean = true) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text)
  const [isDone, setIsDone] = useState(!enabled)

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text)
      setIsDone(true)
      return
    }
    setDisplayed('')
    setIsDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i >= text.length) {
        setDisplayed(text)
        setIsDone(true)
        clearInterval(interval)
      } else {
        setDisplayed(text.slice(0, i))
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, enabled])

  return { displayed, isDone }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md transition-colors hover:opacity-80"
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        border: 'none',
        cursor: 'pointer',
      }}
      aria-label={copied ? '已复制' : '复制内容'}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

function ToolCallPanel({ toolCalls }: { toolCalls: ToolCallStep[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const statusColor = (status: ToolCallStep['status']) => {
    if (status === 'success') return 'var(--brand-main)'
    if (status === 'error') return '#ef4444'
    return 'var(--brand-accent)'
  }

  const statusLabel = (status: ToolCallStep['status']) => {
    if (status === 'success') return '完成'
    if (status === 'error') return '失败'
    return '执行中'
  }

  return (
    <div
      className="rounded-lg border overflow-hidden mt-2 mb-1"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div
        className="px-3.5 py-2.5 flex items-center gap-2 text-xs font-bold"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
        }}
      >
        <Wrench size={13} />
        <span>工具调用步骤 ({toolCalls.length})</span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
        {toolCalls.map((tc) => {
          const isExpanded = expanded.has(tc.id)
          const Icon = tc.toolIcon === 'Wrench' ? Wrench : tc.toolIcon === 'Sparkles' ? Sparkles : BookOpen
          return (
            <div key={tc.id}>
              <button
                onClick={() => toggle(tc.id)}
                className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left transition-colors hover:opacity-90"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${statusColor(tc.status)}20`,
                    color: statusColor(tc.status),
                  }}
                >
                  <Icon size={11} />
                </div>
                <span className="text-xs font-bold flex-1 truncate">{tc.toolName}</span>
                <span className="text-xs text-secondary truncate max-w-[140px]">{tc.summary}</span>
                <Badge variant={tc.status === 'success' ? 'success' : tc.status === 'error' ? 'error' : 'warning'} size="sm">
                  {statusLabel(tc.status)}
                </Badge>
                {tc.duration && (
                  <span className="text-[10px] font-mono text-secondary">{tc.duration}</span>
                )}
                <ChevronDown
                  size={13}
                  className="text-secondary flex-shrink-0 transition-transform duration-200"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                  }}
                />
              </button>
              {isExpanded && tc.detail && (
                <div
                  className="px-3.5 pb-3 pt-0"
                  style={{ paddingLeft: '2.25rem' }}
                >
                  <pre
                    className="text-xs leading-relaxed whitespace-pre-wrap rounded-md p-3"
                    style={{
                      background: 'var(--bg-body)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace',
                    }}
                  >
                    {tc.detail}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StreamingMessage({
  content,
  toolCalls,
  citations,
  onStreamDone,
}: {
  content: string
  toolCalls?: ToolCallStep[]
  citations?: CitationSource[]
  onStreamDone: () => void
}) {
  const [showTools, setShowTools] = useState(false)
  const { displayed, isDone } = useTypewriter(content, 10, true)

  useEffect(() => {
    if (!showTools && toolCalls && toolCalls.length > 0) {
      const timer = setTimeout(() => setShowTools(true), 300)
      return () => clearTimeout(timer)
    }
  }, [toolCalls, showTools])

  useEffect(() => {
    if (isDone) onStreamDone()
  }, [isDone, onStreamDone])

  return (
    <>
      {showTools && toolCalls && <ToolCallPanel toolCalls={toolCalls} />}
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {displayed}
        {!isDone && (
          <span
            className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
            style={{ background: 'var(--brand-main)' }}
          />
        )}
      </div>
      {isDone && citations && citations.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-xs font-bold text-secondary mb-2 flex items-center gap-1.5">
            <BookOpen size={12} />
            引用来源 ({citations.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {citations.map((c, i) => (
              <span
                key={c.id}
                className="text-[11px] px-2 py-0.5 rounded-full font-mono"
                style={{
                  background: 'color-mix(in srgb, var(--brand-main) 12%, transparent)',
                  color: 'var(--brand-main)',
                  border: '1px solid color-mix(in srgb, var(--brand-main) 25%, transparent)',
                }}
              >
                [{i + 1}] {c.docName}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function CitationSidebar({
  citations,
  visible,
  onClose,
}: {
  citations: CitationSource[]
  visible: boolean
  onClose: () => void
}) {
  if (!visible) return null

  return (
    <div
      className="w-[300px] flex-shrink-0 border-l overflow-y-auto"
      style={{
        borderColor: 'var(--border-color)',
        background: 'var(--bg-surface)',
      }}
    >
      <div
        className="px-4 py-3.5 border-b flex items-center justify-between sticky top-0"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <BookOpen size={15} />
          引用溯源
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md transition-colors hover:opacity-80"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
          aria-label="关闭引用面板"
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <div className="p-4 space-y-3">
        {citations.map((c, i) => (
          <div
            key={c.id}
            className="rounded-lg border p-3.5 space-y-2"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--bg-elevated)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: 'color-mix(in srgb, var(--brand-main) 15%, transparent)',
                    color: 'var(--brand-main)',
                  }}
                >
                  [{i + 1}]
                </span>
                <span className="text-xs font-bold truncate">{c.docName}</span>
              </div>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--brand-accent) 15%, transparent)',
                  color: 'var(--brand-accent)',
                }}
              >
                {(c.similarity * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-xs text-secondary flex items-center gap-1.5">
              <FileText size={11} />
              {c.pageOrSection}
            </div>
            <div
              className="text-xs leading-relaxed"
              style={{
                color: 'var(--text-secondary)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {c.snippet}
            </div>
            <button
              className="text-[11px] font-bold transition-colors hover:opacity-80"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brand-main)',
              }}
            >
              查看原文
            </button>
          </div>
        ))}
      </div>
      {/* Session Cost */}
      <div
        className="px-4 py-3 border-t sticky bottom-0"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-surface)',
        }}
      >
        <div
          className="text-xs text-secondary space-y-1.5 rounded-lg p-3"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div className="font-bold flex items-center gap-1.5 mb-2">
            <Zap size={12} />
            本次会话统计
          </div>
          <div className="flex justify-between">
            <span>工具调用</span>
            <span className="font-mono font-bold">3 次</span>
          </div>
          <div className="flex justify-between">
            <span>知识库检索</span>
            <span className="font-mono font-bold">2 条</span>
          </div>
          <div className="flex justify-between">
            <span>Token 消耗</span>
            <span className="font-mono font-bold">2,480</span>
          </div>
          <div className="flex justify-between">
            <span>响应耗时</span>
            <span className="font-mono font-bold">1.3s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickTemplates({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {quickTemplates.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
          style={{
            background: 'color-mix(in srgb, var(--brand-main) 10%, transparent)',
            color: 'var(--brand-main)',
            border: '1px solid color-mix(in srgb, var(--brand-main) 25%, transparent)',
            cursor: 'pointer',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Floating Chat Panel (AiGate Bot)                                   */
/* ------------------------------------------------------------------ */

function FloatingChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'fc-welcome',
      role: 'assistant',
      content:
        '你好！我是 AiGate Bot，可以帮你查询配额、调用日志，或根据选定知识库回答问题。',
      timestamp: '14:00',
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
      { id: `fc-u-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) },
    ])
    setInput('')
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `fc-a-${Date.now()}`,
          role: 'assistant',
          content: '[演示] 已收到您的问题，正在检索知识库并生成回答...',
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
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
/*  Message Bubble                                                     */
/* ------------------------------------------------------------------ */

function MessageBubble({
  msg,
  isStreaming,
  onStreamDone,
}: {
  msg: ChatMessage
  isStreaming?: boolean
  onStreamDone?: () => void
}) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 items-start ${isUser ? 'justify-end' : ''}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--brand-main) 15%, transparent)',
            color: 'var(--brand-main)',
          }}
        >
          <Bot size={16} />
        </div>
      )}

      {/* Message Body */}
      <div className="max-w-[85%] min-w-0">
        {/* Timestamp */}
        <div
          className={`text-[10px] mb-1 flex items-center gap-1 ${isUser ? 'justify-end' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          <Clock size={10} />
          {msg.timestamp || '--:--'}
        </div>

        <div
          className="text-sm leading-relaxed"
          style={{
            background: isUser
              ? 'var(--brand-main)'
              : 'var(--bg-elevated)',
            color: isUser ? 'var(--bg-body)' : 'var(--text-primary)',
            border: isUser ? 'none' : '1px solid var(--border-color)',
            borderRadius: isUser ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
            padding: '12px 16px',
          }}
        >
          {isUser ? (
            msg.content
          ) : isStreaming ? (
            <StreamingMessage
              content={msg.content}
              toolCalls={msg.toolCalls}
              citations={msg.citations}
              onStreamDone={onStreamDone!}
            />
          ) : (
            <>
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <ToolCallPanel toolCalls={msg.toolCalls} />
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="text-xs font-bold text-secondary mb-2 flex items-center gap-1.5">
                    <BookOpen size={12} />
                    引用来源 ({msg.citations.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c, i) => (
                      <span
                        key={c.id}
                        className="text-[11px] px-2 py-0.5 rounded-full font-mono"
                        style={{
                          background: 'color-mix(in srgb, var(--brand-main) 12%, transparent)',
                          color: 'var(--brand-main)',
                          border: '1px solid color-mix(in srgb, var(--brand-main) 25%, transparent)',
                        }}
                      >
                        [{i + 1}] {c.docName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Copy button for assistant messages */}
        {!isUser && !isStreaming && (
          <div className="mt-1.5">
            <CopyButton text={msg.content} />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
          }}
        >
          <User size={16} />
        </div>
      )}
    </div>
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
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [citationSidebarVisible, setCitationSidebarVisible] = useState(true)
  const [currentCitations, setCurrentCitations] = useState<CitationSource[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const thinkingSteps = [
    '正在调起 Milvus 向量库检索相关 SLA 调优标准...',
    '成功检索到 2 个相关索引策略。正在通过 Mysql-MCP 工具联查 Explain 结构...',
    '大模型 gpt-4o 正在组合推理与改写建议...',
  ]

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinkingText])

  const handleStreamDone = useCallback(() => {
    setStreamingId(null)
  }, [])

  const handleSend = (text?: string) => {
    const content = (text || input).trim()
    if (!content) return

    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content, timestamp: now },
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

          // Create assistant reply with streaming
          const replyId = `a-${Date.now()}`
          const reply: ChatMessage = {
            id: replyId,
            role: 'assistant',
            content: botReplyContent,
            toolCalls: mockToolCalls,
            citations: mockCitations,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          }

          setStreamingId(replyId)
          setCurrentCitations(mockCitations)
          setMessages((prev) => [...prev, reply])
        }, 800)
      }, 800)
    }, 800)
  }

  const allCitations = currentCitations.length > 0
    ? currentCitations
    : messages.flatMap((m) => m.citations || [])

  return (
    <div className="h-full flex flex-col">
      {/* ============================================================ */}
      {/*  Page Header                                                 */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/agent"
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--brand-main) 15%, transparent)',
                  color: 'var(--brand-main)',
                }}
              >
                <Bot size={18} />
              </div>
              SQL 调优助理
            </h1>
            <p className="text-secondary text-xs mt-0.5 ml-[42px]">
              底座模型: gpt-4o &middot; 挂载: Milvus 向量库 + Mysql-MCP 工具
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCitationSidebarVisible(!citationSidebarVisible)}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{
              background: citationSidebarVisible
                ? 'color-mix(in srgb, var(--brand-main) 15%, transparent)'
                : 'var(--bg-elevated)',
              color: citationSidebarVisible ? 'var(--brand-main)' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
            }}
            aria-label={citationSidebarVisible ? '隐藏引用面板' : '显示引用面板'}
          >
            {citationSidebarVisible ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
          <button
            onClick={() => {
              setMessages([botWelcome])
              setCurrentCitations([])
              setStreamingId(null)
              setThinking(false)
            }}
            className="btn-secondary text-xs px-3 py-2"
          >
            清空对话
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Chat Grid: Left Info + Chat + Right Citations               */}
      {/* ============================================================ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 overflow-hidden min-h-0">
        {/* ---- Left: Agent Info Panel ---- */}
        <Card className="p-4 space-y-4 overflow-y-auto flex flex-col justify-between hidden lg:flex">
          <div className="space-y-4">
            {/* Agent Identity */}
            <div
              className="text-center pb-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div
                className="w-10 h-10 rounded-xl font-bold flex items-center justify-center mx-auto mb-2"
                style={{
                  background: 'color-mix(in srgb, var(--brand-main) 10%, transparent)',
                  color: 'var(--brand-main)',
                }}
              >
                <Bot size={20} />
              </div>
              <div className="font-bold text-sm">数据库调优专家</div>
              <div className="text-xs text-secondary mt-1">
                专职生产环境 SQL 慢查询拦截与索引治理
              </div>
            </div>

            {/* Dependency Assets */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                依赖资产
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
            <div className="font-bold mb-1.5 flex items-center gap-1.5">
              <Zap size={12} />
              网关状态
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>推理成功率</span>
                <span className="font-mono" style={{ color: 'var(--brand-main)' }}>100%</span>
              </div>
              <div className="flex justify-between">
                <span>平均 RAG 消耗</span>
                <span className="font-mono">18ms</span>
              </div>
              <div className="flex justify-between">
                <span>今日对话数</span>
                <span className="font-mono">24</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ---- Center: Chat Area ---- */}
        <div
          className="card p-0 flex flex-col overflow-hidden relative"
          style={{ background: 'var(--bg-surface)' }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isStreaming={streamingId === msg.id}
                onStreamDone={handleStreamDone}
              />
            ))}

            {/* Thinking Log */}
            {thinking && (
              <div className="flex gap-3 items-start">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--brand-main) 15%, transparent)',
                    color: 'var(--brand-main)',
                  }}
                >
                  <Bot size={16} />
                </div>
                <div
                  className="rounded-lg px-4 py-3 text-xs font-mono border"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-ping flex-shrink-0"
                      style={{ background: 'var(--brand-main)' }}
                    />
                    <span>{thinkingText}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Templates (show only when conversation is short) */}
          {messages.length <= 2 && (
            <div
              className="px-5 py-3 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="text-xs text-secondary mb-2 font-bold flex items-center gap-1.5">
                <Sparkles size={12} />
                快捷问题
              </div>
              <QuickTemplates onSelect={handleSend} />
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
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="输入您的 SQL 查询语句，或描述您遇到的性能问题..."
              className="input-base flex-grow text-sm py-3 px-4 focus:outline-none"
              disabled={thinking || !!streamingId}
            />
            <button
              onClick={() => handleSend()}
              className="btn-primary px-5 font-bold text-sm flex items-center gap-2"
              disabled={thinking || !!streamingId}
            >
              <Send size={14} />
              发送
            </button>
          </div>
        </div>

        {/* ---- Right: Citation Sidebar ---- */}
        {citationSidebarVisible && allCitations.length > 0 && (
          <CitationSidebar
            citations={allCitations}
            visible={citationSidebarVisible}
            onClose={() => setCitationSidebarVisible(false)}
          />
        )}
      </div>

      {/* ============================================================ */}
      {/*  Floating AiGate Bot Chat                                    */}
      {/* ============================================================ */}
      <FloatingChatPanel />
    </div>
  )
}
