import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Tabs } from '@/components/ui/Tabs'
import {
  Download,
  FileText,
  ImageIcon,
  Video,
  Bot,
  Copy,
  Image as ImageLucide,
  Play,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatLog {
  time: string
  key: string
  model: string
  promptTokens: string
  outputTokens: string
  latency: string
  status: number
  prompt: string
  response: string
}

interface ImageLog {
  time: string
  key: string
  model: string
  size: string
  promptSummary: string
  cost: string
  status: number
  prompt: string
}

interface VideoLog {
  time: string
  key: string
  model: string
  duration: string
  resolution: string
  cost: string
  status: number
  prompt: string
}

interface AgentLog {
  time: string
  user: string
  agent: string
  knowledgeBase: string
  toolCalls: string
  totalTokens: string
  status: string
}

type LogDetail =
  | { type: 'chat'; log: ChatLog }
  | { type: 'image'; log: ImageLog }
  | { type: 'video'; log: VideoLog }
  | { type: 'agent'; log: AgentLog }

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const chatLogs: ChatLog[] = [
  {
    time: '2026-04-29 13:12',
    key: 'ag-rd-a8f2',
    model: 'gpt-4o',
    promptTokens: '845',
    outputTokens: '400',
    latency: '1.2s',
    status: 200,
    prompt: '请帮我用 HTML/JS 写一个滑出抽屉组件的代码。',
    response:
      '这是一段滑出抽屉的实现：通过 CSS transform translate-x-full 进行控制，使用 JavaScript classList.toggle(\'translate-x-full\') 进行展开和折叠。',
  },
  {
    time: '2026-04-29 13:10',
    key: 'ag-rd-a8f2',
    model: 'claude-3-5-sonnet',
    promptTokens: '1,240',
    outputTokens: '890',
    latency: '3.4s',
    status: 200,
    prompt: '请审查这段 Python 代码的内存泄漏漏洞。',
    response:
      '我审查了您提供的 Python 代码，发现在多线程处理中使用全局 list 累积数据而没有及时清除。建议使用 queue.Queue 或限定大小的 cache。',
  },
  {
    time: '2026-04-29 12:58',
    key: 'ag-test-x1y2',
    model: 'gpt-4o',
    promptTokens: '-',
    outputTokens: '-',
    latency: '-',
    status: 403,
    prompt: '未授权的提示词获取',
    response: '未授权的调用请求，已被安全网关进行拦截。',
  },
]

const imageLogs: ImageLog[] = [
  {
    time: '2026-04-29 11:30',
    key: 'ag-prod-c3d4',
    model: 'dall-e-3',
    size: '1024x1024',
    promptSummary: '一只赛博朋克风格的熊猫，霓虹灯背景，高精细节。',
    cost: '¥ 2.00',
    status: 200,
    prompt: '一只赛博朋克风格的熊猫，霓虹灯背景，高精细节。',
  },
  {
    time: '2026-04-29 10:15',
    key: 'ag-rd-a8f2',
    model: 'dall-e-3',
    size: '1792x1024',
    promptSummary: '企业级 AI 网关架构图，高对比度设计系统。',
    cost: '¥ 4.00',
    status: 200,
    prompt: '企业级 AI 网关架构图，高对比度设计系统。',
  },
]

const videoLogs: VideoLog[] = [
  {
    time: '2026-04-28 18:20',
    key: 'ag-prod-c3d4',
    model: 'sora-turbo',
    duration: '10s',
    resolution: '1080p',
    cost: '¥ 50.00',
    status: 200,
    prompt: '赛博朋克城市雨夜飞车追逐镜头。',
  },
]

const agentLogs: AgentLog[] = [
  {
    time: '2026-04-29 14:05',
    user: '张三',
    agent: 'AiGate Bot',
    knowledgeBase: 'SLA 运维手册',
    toolCalls: '3 次 (GitHub / Email / DB)',
    totalTokens: '2,480',
    status: '完成',
  },
  {
    time: '2026-04-29 13:40',
    user: '李四',
    agent: '代码审查助手',
    knowledgeBase: '研发规章手册',
    toolCalls: '7 次 (Git / Slack / Sonar)',
    totalTokens: '5,120',
    status: '完成',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const logTabs = [
  { id: 'chat', label: '对话日志', icon: <FileText size={16} /> },
  { id: 'image', label: '生图日志', icon: <ImageIcon size={16} /> },
  { id: 'video', label: '生视频日志', icon: <Video size={16} /> },
  { id: 'agent', label: 'Agent 对话', icon: <Bot size={16} /> },
]

export default function Logs() {
  const [activeTab, setActiveTab] = useState('chat')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<LogDetail | null>(null)

  /* ---- handlers ---- */

  function openDrawer(d: LogDetail) {
    setDetail(d)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
  }

  function copyPrompt(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('[演示系统] 提示词已成功复制到剪贴板！')
    })
  }

  /* ---- table renderers ---- */

  function renderChatTable() {
    return (
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead
            className="border-b text-xs text-secondary uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
          >
            <tr>
              <th className="p-4">时间</th>
              <th className="p-4">Key</th>
              <th className="p-4">模型</th>
              <th className="p-4">提示词 Tokens</th>
              <th className="p-4">输出 Tokens</th>
              <th className="p-4">耗时</th>
              <th className="p-4 text-right">状态</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {chatLogs.map((log, i) => (
              <tr
                key={i}
                className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => openDrawer({ type: 'chat', log })}
              >
                <td className="p-4 text-secondary">{log.time}</td>
                <td className="p-4 font-mono text-brand-main">{log.key}</td>
                <td className="p-4">{log.model}</td>
                <td className="p-4 font-mono">{log.promptTokens}</td>
                <td className="p-4 font-mono">{log.outputTokens}</td>
                <td className="p-4 text-secondary">{log.latency}</td>
                <td className="p-4 text-right">
                  <Badge variant={log.status === 200 ? 'success' : 'warning'}>{log.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )
  }

  function renderImageTable() {
    return (
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead
            className="border-b text-xs text-secondary uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
          >
            <tr>
              <th className="p-4">时间</th>
              <th className="p-4">Key</th>
              <th className="p-4">模型</th>
              <th className="p-4">尺寸</th>
              <th className="p-4">提示词摘要</th>
              <th className="p-4">费用</th>
              <th className="p-4 text-right">状态</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {imageLogs.map((log, i) => (
              <tr
                key={i}
                className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => openDrawer({ type: 'image', log })}
              >
                <td className="p-4 text-secondary">{log.time}</td>
                <td className="p-4 font-mono text-brand-main">{log.key}</td>
                <td className="p-4">{log.model}</td>
                <td className="p-4">{log.size}</td>
                <td className="p-4 text-secondary max-w-xs truncate">{log.promptSummary}</td>
                <td className="p-4 font-mono">{log.cost}</td>
                <td className="p-4 text-right">
                  <Badge variant={log.status === 200 ? 'success' : 'warning'}>{log.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )
  }

  function renderVideoTable() {
    return (
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead
            className="border-b text-xs text-secondary uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
          >
            <tr>
              <th className="p-4">时间</th>
              <th className="p-4">Key</th>
              <th className="p-4">模型</th>
              <th className="p-4">时长</th>
              <th className="p-4">分辨率</th>
              <th className="p-4">费用</th>
              <th className="p-4 text-right">状态</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {videoLogs.map((log, i) => (
              <tr
                key={i}
                className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => openDrawer({ type: 'video', log })}
              >
                <td className="p-4 text-secondary">{log.time}</td>
                <td className="p-4 font-mono text-brand-main">{log.key}</td>
                <td className="p-4">{log.model}</td>
                <td className="p-4">{log.duration}</td>
                <td className="p-4">{log.resolution}</td>
                <td className="p-4 font-mono">{log.cost}</td>
                <td className="p-4 text-right">
                  <Badge variant={log.status === 200 ? 'success' : 'warning'}>{log.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )
  }

  function renderAgentTable() {
    return (
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead
            className="border-b text-xs text-secondary uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
          >
            <tr>
              <th className="p-4">时间</th>
              <th className="p-4">用户</th>
              <th className="p-4">Agent</th>
              <th className="p-4">调用知识库</th>
              <th className="p-4">工具调用次数</th>
              <th className="p-4">总 Tokens</th>
              <th className="p-4 text-right">状态</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {agentLogs.map((log, i) => (
              <tr
                key={i}
                className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => openDrawer({ type: 'agent', log })}
              >
                <td className="p-4 text-secondary">{log.time}</td>
                <td className="p-4">{log.user}</td>
                <td className="p-4 text-brand-main font-bold">{log.agent}</td>
                <td className="p-4 text-secondary">{log.knowledgeBase}</td>
                <td className="p-4 font-mono">{log.toolCalls.match(/\d+/)?.[0]}</td>
                <td className="p-4 font-mono">{log.totalTokens}</td>
                <td className="p-4 text-right">
                  <Badge variant="success">{log.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )
  }

  /* ---- drawer content ---- */

  function renderDrawerContent() {
    if (!detail) return null

    const d = detail
    const log = d.log

    return (
      <>
        {/* Key & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="text-secondary text-xs">调用凭证 (Key)</div>
            <div className="text-xs font-mono font-bold mt-1 text-brand-main">{'key' in log ? log.key : '-'}</div>
          </div>
          <div
            className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="text-secondary text-xs">执行状态 (Status)</div>
            <div className="text-xs font-bold mt-1 text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              {d.type === 'agent' ? (log as AgentLog).status : `${('status' in log ? (log as ChatLog | ImageLog | VideoLog).status : 200)} OK`}
            </div>
          </div>
        </div>

        {/* Chat detail */}
        {d.type === 'chat' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-secondary uppercase">用户输入 (Prompt)</label>
                <button
                  onClick={() => copyPrompt((log as ChatLog).prompt)}
                  className="text-xs text-brand-main font-bold hover:underline flex items-center gap-1"
                >
                  <Copy size={12} /> 复制提示词
                </button>
              </div>
              <div
                className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border text-xs leading-relaxed"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {(log as ChatLog).prompt}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">模型响应 (Response)</label>
              <div
                className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border text-xs leading-relaxed font-mono"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {(log as ChatLog).response}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div
                className="bg-black/10 dark:bg-white/5 p-2 rounded border text-center"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="text-[10px] text-secondary">提示 Tokens</div>
                <div className="text-xs font-bold mt-0.5">{(log as ChatLog).promptTokens}</div>
              </div>
              <div
                className="bg-black/10 dark:bg-white/5 p-2 rounded border text-center"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="text-[10px] text-secondary">输出 Tokens</div>
                <div className="text-xs font-bold mt-0.5">{(log as ChatLog).outputTokens}</div>
              </div>
              <div
                className="bg-black/10 dark:bg-white/5 p-2 rounded border text-center"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="text-[10px] text-secondary">模型耗时</div>
                <div className="text-xs font-bold mt-0.5">{(log as ChatLog).latency}</div>
              </div>
            </div>
          </div>
        )}

        {/* Image detail */}
        {d.type === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">生图 Prompt & 规格</label>
              <div
                className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border text-xs"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {(log as ImageLog).prompt}
              </div>
            </div>
            <div
              className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border text-xs text-brand-accent font-bold"
              style={{ borderColor: 'var(--border-color)' }}
            >
              生成尺寸: {(log as ImageLog).size} | 实际产生计费: {(log as ImageLog).cost}
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">多媒体预览</label>
              <div
                className="w-full h-44 bg-black/10 dark:bg-white/5 border border-dashed rounded-lg flex flex-col items-center justify-center text-secondary gap-2 p-4 text-center"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <ImageLucide size={28} strokeWidth={1.5} />
                <span className="text-xs font-bold text-brand-main">{'生图预览 - 点击以查看原图'}</span>
                <span className="text-[10px] opacity-80">{(log as ImageLog).prompt}</span>
              </div>
            </div>
          </div>
        )}

        {/* Video detail */}
        {d.type === 'video' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">生视频 Prompt & 规格</label>
              <div
                className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border text-xs"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {(log as VideoLog).prompt}
              </div>
            </div>
            <div
              className="bg-black/10 dark:bg-white/5 p-3 rounded-lg border text-xs text-brand-accent font-bold"
              style={{ borderColor: 'var(--border-color)' }}
            >
              时长/规格: {(log as VideoLog).duration} / {(log as VideoLog).resolution} | 实际产生计费: {(log as VideoLog).cost}
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">多媒体预览</label>
              <div
                className="w-full h-44 bg-black/10 dark:bg-white/5 border border-dashed rounded-lg flex flex-col items-center justify-center text-secondary gap-2 p-4 text-center"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Play size={28} strokeWidth={1.5} />
                <span className="text-xs font-bold text-brand-main">{'生视频模拟播放'}</span>
                <span className="text-[10px] opacity-80">{(log as VideoLog).prompt}</span>
              </div>
            </div>
          </div>
        )}

        {/* Agent detail */}
        {d.type === 'agent' && (
          <div className="space-y-4">
            <div
              className="bg-black/10 dark:bg-white/5 p-4 rounded-lg border space-y-3"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div
                className="flex justify-between items-center text-xs border-b pb-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="text-secondary">目标智能体 (Agent)</span>
                <span className="font-bold text-brand-main">{(log as AgentLog).agent}</span>
              </div>
              <div
                className="flex justify-between items-center text-xs border-b pb-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="text-secondary">检索关联知识库</span>
                <span className="font-bold">{(log as AgentLog).knowledgeBase}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-secondary">MCP 工具调用连结</span>
                <span className="font-bold text-brand-accent">{(log as AgentLog).toolCalls}</span>
              </div>
            </div>

            {/* Agent topology */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">智能体执行拓扑</label>
              <div className="space-y-3 text-xs">
                <div className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 bg-brand-main rounded-full mt-1.5 shrink-0" />
                  <div>
                    <div className="font-bold">1. 开启意图分类 (Intent Routing)</div>
                    <div className="text-secondary mt-0.5">模型判定用户意图为 "查询服务器故障预案"</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 bg-brand-main rounded-full mt-1.5 shrink-0" />
                  <div>
                    <div className="font-bold">2. 检索向量知识库 (Milvus Vector DB)</div>
                    <div className="text-secondary mt-0.5">命中 "SLA运维手册" 段落，匹配度 92.4%</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 bg-brand-accent rounded-full mt-1.5 shrink-0" />
                  <div>
                    <div className="font-bold">3. MCP 外部工具调用 (Tool Call)</div>
                    <div className="text-brand-accent font-bold mt-0.5">
                      已触发 GitHub CLI 读取对应部署脚本仓库提交历史
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  /* ---- main render ---- */

  return (
    <div>
      <PageHeader
        title="调用日志"
        subtitle="全量 AI 调用追踪，涵盖对话、生图、生视频及 Agent 对话日志。"
        breadcrumbs={[{ label: '网关接入' }, { label: '请求日志' }]}
        actions={
          <Button variant="secondary" icon={<Download size={16} />}>
            导出 CSV
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={logTabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-4 items-end" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
        <div className="space-y-1 flex-1 min-w-36">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">时间范围</label>
          <select className="input-base w-full">
            <option>最近 24 小时</option>
            <option>最近 7 天</option>
            <option>本月</option>
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-36">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">调用 Key</label>
          <input className="input-base w-full" placeholder="ag-..." />
        </div>
        <div className="space-y-1 flex-1 min-w-36">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest">模型</label>
          <select className="input-base w-full">
            <option>全部</option>
            <option>gpt-4o</option>
            <option>claude-3-5-sonnet</option>
            <option>dall-e-3</option>
          </select>
        </div>
        <Button variant="secondary">查询</Button>
      </div>

      {/* Tab content */}
      {activeTab === 'chat' && renderChatTable()}
      {activeTab === 'image' && renderImageTable()}
      {activeTab === 'video' && renderVideoTable()}
      {activeTab === 'agent' && renderAgentTable()}

      {/* Log detail drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={detail?.type === 'agent' ? (detail.log as AgentLog).agent : (detail && 'model' in detail.log ? (detail.log as ChatLog).model : '')}
        description={detail?.log.time}
        width="sm"
      >
        {renderDrawerContent()}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" className="w-full" onClick={closeDrawer}>
            关闭明细
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
