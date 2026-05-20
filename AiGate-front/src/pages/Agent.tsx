import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Bot, Plus, MessageSquare, FileText, Search } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface AgentItem {
  id: string
  name: string
  description: string
  status: 'running' | 'draft'
  builtin?: boolean
  tags: string[]
  accentBorder?: boolean
}

const agents: AgentItem[] = [
  {
    id: 'aigate-bot',
    name: 'AiGate Bot',
    description: '系统级管理助手，查询配额、日志与组织数据。',
    status: 'running',
    builtin: true,
    tags: ['技能: SQL生成', '知识库: 全局', '记忆: 开启'],
    accentBorder: false,
  },
  {
    id: 'code-review',
    name: '代码审查助手',
    description: '抓取 GitLab MR，结合规范手册生成评审意见。',
    status: 'running',
    tags: ['MCP: GitLab', '技能: 代码审查', '知识库: 研发规章'],
    accentBorder: true,
  },
  {
    id: 'requirement',
    name: '需求拆解助手',
    description: '将 PRD 文档自动拆解为用户故事与研发任务。',
    status: 'draft',
    tags: ['技能: 需求拆解', '知识库: 产品设计文档'],
  },
]

interface LogRow {
  time: string
  user: string
  agent: string
  knowledge: string
  toolCalls: string
  tokens: string
  status: 'success' | 'timeout'
}

const recentLogs: LogRow[] = [
  {
    time: '2026-04-29 14:05',
    user: '张三',
    agent: 'AiGate Bot',
    knowledge: 'SLA 运维手册',
    toolCalls: '3 次',
    tokens: '2,480',
    status: 'success',
  },
  {
    time: '2026-04-29 13:40',
    user: '李四',
    agent: '代码审查助手',
    knowledge: '研发规章手册',
    toolCalls: '7 次',
    tokens: '5,120',
    status: 'success',
  },
  {
    time: '2026-04-29 11:22',
    user: '王五',
    agent: '代码审查助手',
    knowledge: '-',
    toolCalls: '2 次',
    tokens: '890',
    status: 'timeout',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Agent() {
  return (
    <div>
      {/* ============================================================ */}
      {/*  Page Header                                                 */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent 引擎</h1>
          <p className="text-secondary mt-1">
            基于 LangGraph 编排智能体工作流，绑定知识库、MCP 工具与 Skills 技能。
          </p>
        </div>
        <Button icon={<Plus size={16} />}>编排 Agent</Button>
      </div>

      {/* ============================================================ */}
      {/*  Agent Cards Grid                                            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}

        {/* Add New Agent Card */}
        <Card
          hover
          className="flex items-center justify-center border-dashed min-h-[160px]"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="text-center text-secondary">
            <Plus size={36} className="mx-auto mb-3 opacity-50" />
            <div className="font-bold">编排新 Agent</div>
            <div className="text-xs mt-1">组合 Skills + MCP + 知识库</div>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Recent Conversation Logs                                    */}
      {/* ============================================================ */}
      <Card className="p-0 overflow-hidden">
        <div
          className="p-4 border-b font-bold flex justify-between items-center"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span>最近 Agent 对话日志</span>
          <a
            href="#/logs"
            className="text-xs text-brand-main font-bold hover:underline"
          >
            查看全部
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead
              className="border-b text-xs text-secondary uppercase tracking-wider"
              style={{
                borderColor: 'var(--border-color)',
                background: 'rgba(0,0,0,0.05)',
              }}
            >
              <tr>
                <th className="p-4">时间</th>
                <th className="p-4">用户</th>
                <th className="p-4">Agent</th>
                <th className="p-4">调用知识库</th>
                <th className="p-4">工具调用</th>
                <th className="p-4">Tokens</th>
                <th className="p-4 text-right">状态</th>
              </tr>
            </thead>
            <tbody
              className="text-sm divide-y"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {recentLogs.map((log, i) => (
                <tr
                  key={i}
                  className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  <td className="p-4 text-secondary">{log.time}</td>
                  <td className="p-4">{log.user}</td>
                  <td className="p-4 font-bold text-brand-main">{log.agent}</td>
                  <td className="p-4 text-secondary">{log.knowledge}</td>
                  <td className="p-4 font-mono">{log.toolCalls}</td>
                  <td className="p-4 font-mono">{log.tokens}</td>
                  <td className="p-4 text-right">
                    <Badge variant={log.status === 'success' ? 'success' : 'warning'}>
                      {log.status === 'success' ? '完成' : '超时'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function AgentCard({ agent }: { agent: AgentItem }) {
  const isBuiltin = agent.builtin

  return (
    <Card
      className={
        isBuiltin
          ? 'border-brand-main'
          : agent.accentBorder
            ? 'border-l-4'
            : ''
      }
      style={
        isBuiltin
          ? {
              borderColor: 'var(--brand-main)',
              background:
                'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))',
            }
          : agent.accentBorder
            ? { borderLeftColor: 'var(--brand-accent)' }
            : { borderLeftColor: 'var(--border-color)' }
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {isBuiltin && (
            <div
              className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center"
              style={{
                background: 'var(--bg-body)',
                borderColor: 'var(--brand-main)',
                color: 'var(--brand-main)',
              }}
            >
              <Bot size={22} strokeWidth={2.5} />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {agent.name}
              {isBuiltin && (
                <span
                  className="px-2 py-0.5 text-xs uppercase font-black rounded"
                  style={{
                    background: 'var(--brand-main)',
                    color: 'var(--bg-body)',
                  }}
                >
                  内置
                </span>
              )}
            </h2>
            <p className="text-xs text-secondary mt-1">{agent.description}</p>
          </div>
        </div>
        <Badge variant={agent.status === 'running' ? 'success' : 'warning'}>
          {agent.status === 'running' ? '运行中' : '草稿'}
        </Badge>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {agent.tags.map((tag) => (
          <span
            key={tag}
            className="badge"
            style={{ borderColor: 'var(--text-secondary)' }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      {isBuiltin ? (
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1 text-sm py-2"
            icon={<MessageSquare size={14} />}
          >
            对话体验
          </Button>
          <Button
            variant="secondary"
            className="text-sm py-2 px-4"
            icon={<FileText size={14} />}
          >
            查看日志
          </Button>
        </div>
      ) : agent.status === 'running' ? (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 text-sm py-2">
            调试
          </Button>
          <Button variant="secondary" className="text-sm py-2 px-4" icon={<Search size={14} />}>
            对话日志
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1 text-sm py-2">
            发布
          </Button>
          <Button variant="secondary" className="text-sm py-2 px-4">
            编辑
          </Button>
        </div>
      )}
    </Card>
  )
}
