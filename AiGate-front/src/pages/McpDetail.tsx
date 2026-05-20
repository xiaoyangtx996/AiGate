import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Play } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const integrationInfo = [
  { label: '注册类型', value: 'stdio / HTTP SSE', mono: true },
  { label: '接口商', value: 'Enterprise Private' },
  { label: '认证方式', value: 'Bearer OAuth', mono: true },
  { label: '调用次数', value: '24,590 次', mono: true, accent: true },
]

const exposedTools = [
  {
    name: 'get_repo_issues',
    desc: '拉取指定仓库下的所有活跃 Issues',
  },
  {
    name: 'create_pull_request',
    desc: '创建新 Pull Request 代码分支合并请求',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function McpDetail() {
  const [sandboxMethod, setSandboxMethod] = useState('get_repo_issues')
  const [sandboxParams, setSandboxParams] = useState(
    `{\n  "owner": "xiaoyangtx996",\n  "repo": "AiGate",\n  "state": "open"\n}`
  )
  const [resultVisible, setResultVisible] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [running, setRunning] = useState(false)

  function handleRunSandbox() {
    setRunning(true)
    setResultVisible(true)
    setResponseText('正在调起 Github-MCP-Server stdio 管道建立，传输加密参数流中...')

    setTimeout(() => {
      setResponseText(
        JSON.stringify(
          [
            { id: 1024, title: '优化 keys.html 列表渲染性能', user: 'xufan', status: 'open' },
            { id: 1025, title: '增加 prompts.html 对话框实时变量填槽', user: 'antigravity', status: 'open' },
          ],
          null,
          2
        )
      )
      setRunning(false)
    }, 800)
  }

  return (
    <div>
      {/* ============================================================ */}
      {/*  Page Header                                                 */}
      {/* ============================================================ */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/mcp"
          className="text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Github-MCP-Server
            </h1>
            <Badge variant="success">健康率 100%</Badge>
          </div>
          <p className="text-secondary mt-1">
            暴露 GitHub 各类 API 供 Agent 调用，以便于实现自动化 Code Review 与
            Issue 总结。
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Content Grid                                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Left Column ---- */}
        <div className="lg:col-span-1 space-y-6">
          {/* Integration Basics */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              集成基础信息
            </h3>
            <div className="space-y-2 text-sm">
              {integrationInfo.map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-secondary">{item.label}:</span>
                  <span
                    className={`${item.mono ? 'font-mono' : ''} ${item.accent ? 'font-bold text-brand-main' : ''}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Exposed Tools */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              暴露的接口清单 (Exposed Tools)
            </h3>
            <div className="space-y-2">
              {exposedTools.map((tool) => (
                <div
                  key={tool.name}
                  className="p-3 border rounded-lg"
                  style={{
                    background: 'color-mix(in srgb, var(--brand-main) 5%, transparent)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div className="font-bold text-xs font-mono text-brand-main">
                    {tool.name}
                  </div>
                  <div className="text-[10px] text-secondary mt-0.5">
                    {tool.desc}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ---- Right Column: Sandbox ---- */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              沙箱工具调试 (Tool Sandbox)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  选择调试的方法
                </label>
                <select
                  className="input-base w-full"
                  value={sandboxMethod}
                  onChange={(e) => setSandboxMethod(e.target.value)}
                >
                  {exposedTools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  参数内容 (JSON Args)
                </label>
                <textarea
                  className="input-base text-xs font-mono h-24 p-3 leading-relaxed w-full"
                  value={sandboxParams}
                  onChange={(e) => setSandboxParams(e.target.value)}
                />
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full text-xs py-3 font-bold"
              loading={running}
              icon={<Play size={14} />}
              onClick={handleRunSandbox}
            >
              立即运行测试
            </Button>

            {resultVisible && (
              <div className="space-y-2 mt-4">
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
                  返回结果 (Response Payload)
                </label>
                <pre
                  className="p-4 rounded-lg border text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))',
                  }}
                >
                  {responseText}
                </pre>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
