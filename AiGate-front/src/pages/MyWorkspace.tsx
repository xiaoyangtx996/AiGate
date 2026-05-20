import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Copy,
  Info,
  PenLine,
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApiKeyItem {
  id: string
  name: string
  keyPreview: string
  keyFull: string
  status: 'normal' | 'expiring'
  expiryWarning?: string
}

interface CallLogRow {
  id: string
  time: string
  callType: string
  model: string
  tokens: string
  status: number
  isError?: boolean
}

interface PromptCard {
  id: string
  tag: string
  title: string
  description: string
  template: string
  variables: { key: string; label: string }[]
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_KEYS: ApiKeyItem[] = [
  {
    id: '1',
    name: 'Cursor Copilot',
    keyPreview: 'ag-prod-8f2c...e19b',
    keyFull: 'ag-prod-8f2ca374d858c8a147e8c39e19b',
    status: 'normal',
  },
  {
    id: '2',
    name: 'DEV_API_Key',
    keyPreview: 'ag-dev-a1b2...c3d4',
    keyFull: 'ag-dev-a1b2c3d4e5f678901234567890b',
    status: 'expiring',
    expiryWarning: 'DEV_API_Key 还有 3 天过期',
  },
]

const MOCK_CALLS: CallLogRow[] = [
  { id: '1', time: '10:42:15', callType: 'Cursor Copilot', model: 'claude-3-5-sonnet', tokens: '1,240', status: 200 },
  { id: '2', time: '09:15:33', callType: '对话: 代码审查助手', model: 'gpt-4o', tokens: '4,150', status: 200 },
  { id: '3', time: '昨天 18:20', callType: 'DEV_API_Key', model: 'claude-3-opus', tokens: '-', status: 403, isError: true },
  { id: '4', time: '昨天 16:11', callType: 'MCP: GitHub API', model: 'get_pr_diff', tokens: '820', status: 200 },
]

const MOCK_PROMPTS: PromptCard[] = [
  {
    id: '1',
    tag: '办公高效',
    title: '周报周总结生成器',
    description: '一键生成企业高管级周报，支持汇报风格、下周规划等字段。',
    template: '请根据以下工作内容：\n{{work_details}}\n\n生成一份结构清晰、条理分明的高管级汇报周报。要求以【{{tone}}】语气书写，并规划下周工作重心。',
    variables: [
      { key: 'work_details', label: '本周具体工作内容' },
      { key: 'tone', label: '汇报风格语气 (例如: 专业严谨, 务实精简)' },
    ],
  },
  {
    id: '2',
    tag: '开发工具',
    title: 'SQL 调优建议专家',
    description: '对给出的 SQL 查询进行多维度性能分析，自动适配主流数据库引擎进行调优。',
    template: '我有一个 SQL 查询语句：\n{{sql_query}}\n\n使用的数据库类型是：{{db_type}}。\n请分析这个 SQL 可能会导致慢查询的原因，并提供索引优化和重写后的 SQL 语句。',
    variables: [
      { key: 'sql_query', label: '待优化 SQL 查询语句' },
      { key: 'db_type', label: '数据库类型 (MySQL / PostgreSQL / Oracle)' },
    ],
  },
  {
    id: '3',
    tag: '开发工具',
    title: 'TypeScript 泛型助手',
    description: '分析 JavaScript 或普通 TS 代码，一键升级为类型安全的 TS 泛型结构。',
    template: '下面这段 JS/TS 代码：\n{{code}}\n\n请为其补充严格的 TypeScript 声明与泛型约束，防止 any 泄露。',
    variables: [{ key: 'code', label: 'JavaScript / TS 代码段' }],
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MyWorkspace() {
  const [keys, setKeys] = useState<ApiKeyItem[]>(MOCK_KEYS)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [activePrompt, setActivePrompt] = useState<PromptCard | null>(null)
  const [promptVarValues, setPromptVarValues] = useState<Record<string, string>>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyEnv, setNewKeyEnv] = useState('ag-dev-')
  const [newKeyQuota, setNewKeyQuota] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState('30')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  /* ---- handlers ---- */
  const handleCopyKey = useCallback((fullKey: string) => {
    navigator.clipboard.writeText(fullKey)
  }, [])

  const handleGenerateKey = useCallback(() => {
    if (!newKeyName.trim()) return
    const randomHex = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('')
    const full = `${newKeyEnv}${randomHex}`
    const preview = `${newKeyEnv}${randomHex.slice(0, 4)}...${randomHex.slice(-4)}`
    setGeneratedKey(full)
    setKeys((prev) => [
      {
        id: Date.now().toString(),
        name: newKeyName,
        keyPreview: preview,
        keyFull: full,
        status: 'normal',
      },
      ...prev,
    ])
  }, [newKeyName, newKeyEnv])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
    setNewKeyName('')
    setNewKeyEnv('ag-dev-')
    setNewKeyQuota('')
    setNewKeyExpiry('30')
    setGeneratedKey(null)
  }, [])

  const handleOpenPrompt = useCallback((prompt: PromptCard) => {
    setActivePrompt(prompt)
    setPromptVarValues({})
    setPromptModalOpen(true)
  }, [])

  const handleVarChange = useCallback((key: string, value: string) => {
    setPromptVarValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const previewText = activePrompt
    ? activePrompt.variables.reduce((acc, v) => {
        const val = promptVarValues[v.key]?.trim() || `{{${v.key}}}`
        return acc.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), val)
      }, activePrompt.template)
    : ''

  const allVarsFilled = activePrompt
    ? activePrompt.variables.every((v) => promptVarValues[v.key]?.trim())
    : false

  return (
    <div>
      {/* ============================================================ */}
      {/*  Page Header                                                  */}
      {/* ============================================================ */}
      <PageHeader
        title="你好，李四"
        subtitle="你的专属 AI 工作台。已连接到产品研发中心。"
        breadcrumbs={[{ label: '数据中心' }, { label: '我的工作台' }]}
      >
        <div className="text-xs font-bold uppercase tracking-widest text-brand-main">
          My Workspace
        </div>
      </PageHeader>

      {/* ============================================================ */}
      {/*  Stat Cards (4-up)                                            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Usage */}
        <div className="card p-5 relative" style={{ borderTop: '4px solid var(--brand-main)' }}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-secondary text-xs font-bold uppercase tracking-widest">
              本月个人用量
            </h3>
            <span className="text-xs font-bold text-brand-main">正常</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">120K</span>
            <span className="text-secondary text-sm">/ 2M</span>
          </div>
          <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 mt-3 rounded overflow-hidden">
            <div className="bg-brand-main h-full" style={{ width: '6%' }} />
          </div>
          <div className="text-xs text-secondary mt-2">消耗占比仅 6%，可放心使用</div>
        </div>

        {/* Key Status */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-secondary text-xs font-bold uppercase tracking-widest">
              专属密钥状态
            </h3>
            <Link to="/keys" className="text-xs text-brand-main hover:underline">
              管理
            </Link>
          </div>
          <div className="text-3xl font-bold">
            2 <span className="text-sm text-secondary font-normal">个活跃</span>
          </div>
          <div className="text-xs text-brand-accent mt-3 flex items-center gap-1">
            <AlertTriangle size={12} />
            DEV_API_Key 还有 3 天过期
          </div>
        </Card>

        {/* Agents */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-secondary text-xs font-bold uppercase tracking-widest">
              可用 Agent
            </h3>
            <Link to="/agent" className="text-xs text-brand-main hover:underline">
              浏览
            </Link>
          </div>
          <div className="text-3xl font-bold">
            5 <span className="text-sm text-secondary font-normal">个</span>
          </div>
          <div className="text-xs text-secondary mt-3">包含 2 个研发中心专属助手</div>
        </Card>

        {/* Knowledge */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-secondary text-xs font-bold uppercase tracking-widest">
              授权知识库
            </h3>
            <Link to="/knowledge" className="text-xs text-brand-main hover:underline">
              查看
            </Link>
          </div>
          <div className="text-3xl font-bold">
            3 <span className="text-sm text-secondary font-normal">个</span>
          </div>
          <div className="text-xs text-secondary mt-3">最近查阅：产品需求文档 v2.0</div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Keys + Calls Row                                             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick API Keys */}
        <div className="col-span-1 flex flex-col gap-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">快捷调用密钥</h3>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setDrawerOpen(true)}>
                新建
              </Button>
            </div>
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="p-3 border rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-bold text-sm">{key.name}</div>
                    <Badge variant={key.status === 'normal' ? 'success' : 'warning'} size="sm">
                      {key.status === 'normal' ? '正常' : '即将过期'}
                    </Badge>
                  </div>
                  <div
                    className="flex items-center justify-between mt-2 bg-black/5 dark:bg-white/5 p-2 rounded"
                  >
                    <code className="text-xs text-secondary font-mono">{key.keyPreview}</code>
                    <button
                      className="text-secondary hover:text-brand-main cursor-pointer"
                      onClick={() => handleCopyKey(key.keyFull)}
                      title="复制完整 Key"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  {key.expiryWarning && (
                    <div className="text-xs text-secondary mt-2 flex justify-between">
                      剩余 3 天
                      <span className="text-brand-main hover:underline cursor-pointer">去续期</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-secondary flex items-start gap-2 bg-black/5 dark:bg-white/5 p-3 rounded">
              <Info size={14} className="shrink-0 mt-0.5" />
              <div>
                不知道如何配置？查看{' '}
                <Link to="/developer" className="text-brand-main hover:underline">
                  Cursor / IDE 接入指南
                </Link>
                。
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Calls Table */}
        <Card className="col-span-1 lg:col-span-2 p-0 flex flex-col overflow-hidden">
          <div
            className="p-4 border-b flex justify-between items-center"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <h3 className="font-bold">我的最近调用</h3>
            <Link to="/logs" className="text-xs text-brand-main hover:underline">
              查看全部日志
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead
                className="text-xs text-secondary bg-black/5 dark:bg-white/5 border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <tr>
                  <th className="p-3 pl-4">时间</th>
                  <th className="p-3">调用类型</th>
                  <th className="p-3">模型/工具</th>
                  <th className="p-3">消耗 Token</th>
                  <th className="p-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {MOCK_CALLS.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-black/5 dark:hover:bg-white/5 ${row.isError ? 'bg-red-500/5' : ''}`}
                  >
                    <td className="p-3 pl-4 text-secondary text-xs">{row.time}</td>
                    <td className={`p-3 ${row.callType.includes('对话') ? 'text-brand-main font-bold' : ''}`}>
                      {row.callType}
                    </td>
                    <td className={`p-3 font-medium ${row.isError ? 'text-brand-accent' : ''}`}>
                      {row.model}
                    </td>
                    <td className={`p-3 font-mono ${row.tokens === '-' ? 'text-secondary' : ''}`}>
                      {row.tokens}
                    </td>
                    <td className="p-3">
                      <Badge variant={row.status === 200 ? 'success' : 'warning'} size="sm">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Prompts Workspace                                            */}
      {/* ============================================================ */}
      <Card className="mt-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-lg">常用快捷提示词 (Prompts Workspace)</h3>
            <p className="text-xs text-secondary mt-0.5">
              点击提示词卡片可自动解析变量并快捷表单化输入
            </p>
          </div>
          <Link to="/prompts" className="text-xs text-brand-main hover:underline">
            浏览提示词市场
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MOCK_PROMPTS.map((prompt) => (
            <div
              key={prompt.id}
              className="p-4 border rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex flex-col justify-between group"
              style={{ borderColor: 'var(--border-color)' }}
              onClick={() => handleOpenPrompt(prompt)}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                    {prompt.tag}
                  </Badge>
                  <PenLine
                    size={14}
                    className="text-secondary group-hover:text-brand-main transition-colors"
                  />
                </div>
                <h4 className="font-bold text-sm">{prompt.title}</h4>
                <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                  {prompt.description}
                </p>
              </div>
              <div className="text-xs text-brand-main font-bold mt-4">立即使用</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  Prompt Variable Modal                                        */}
      {/* ============================================================ */}
      <Modal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        title={activePrompt?.title ?? '变量表单化生成器'}
        size="lg"
      >
        {activePrompt && (
          <>
            <div className="space-y-4">
              {activePrompt.variables.map((v) => (
                <div key={v.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
                    {v.label}
                  </label>
                  <textarea
                    className="input text-xs h-20 p-2.5 resize-none w-full"
                    placeholder="请输入内容..."
                    value={promptVarValues[v.key] ?? ''}
                    onChange={(e) => handleVarChange(v.key, e.target.value)}
                    style={{
                      background: 'var(--bg-body)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--border-radius-base)',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1 mt-4">
              <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
                实时 Prompt 预览
              </label>
              <div
                className="p-3 rounded border text-xs text-secondary leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap font-mono"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                {previewText}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                className="flex-grow"
                onClick={() => setPromptModalOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                className="flex-grow"
                disabled={!allVarsFilled}
                onClick={() => setPromptModalOpen(false)}
              >
                一键注入到 AI 对话
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ============================================================ */}
      {/*  New Key Drawer                                               */}
      {/* ============================================================ */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title="创建专属调用密钥"
        description="CREATE GATEWAY KEY"
        width="sm"
      >
        <div className="space-y-4">
          {/* Key Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
              密钥名称 / 用途
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="如：Cursor Copilot Office"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
          </div>

          {/* Environment */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
              调用环境 (Prefix)
            </label>
            <select
              className="input-base"
              value={newKeyEnv}
              onChange={(e) => setNewKeyEnv(e.target.value)}
            >
              <option value="ag-dev-">ag-dev- (开发测试)</option>
              <option value="ag-stg-">ag-stg- (Staging 预发)</option>
              <option value="ag-prod-">ag-prod- (生产环境)</option>
            </select>
          </div>

          {/* Quota */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
              限制配额级别
            </label>
            <select
              className="input-base"
              value={newKeyQuota}
              onChange={(e) => setNewKeyQuota(e.target.value)}
            >
              <option value="">¥200 / 月 (默认入门级)</option>
              <option value="1000">¥1,000 / 月 (标准开发级)</option>
              <option value="5000">¥5,000 / 月 (高并发大盘压测)</option>
            </select>
          </div>

          {/* Expiry */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest block">
              过期时间 (Expiration)
            </label>
            <select
              className="input-base"
              value={newKeyExpiry}
              onChange={(e) => setNewKeyExpiry(e.target.value)}
            >
              <option value="30">30 天 (标准安全轮换期)</option>
              <option value="90">90 天</option>
              <option value="365">1 年</option>
            </select>
          </div>

          {/* Generated Key Display */}
          {generatedKey && (
            <div className="mt-6 p-4 rounded-xl border border-brand-main/30 space-y-3"
              style={{ background: 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))' }}
            >
              <div className="text-xs font-bold text-brand-main flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                密钥生成成功！请妥善保存，它将不会再次显示。
              </div>
              <div
                className="flex items-center justify-between p-2.5 rounded border"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <code className="text-xs font-bold font-mono text-brand-main">
                  {generatedKey.slice(0, 12)}...{generatedKey.slice(-8)}
                </code>
                <button
                  className="text-secondary hover:text-brand-main cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(generatedKey)}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" className="flex-grow" onClick={handleCloseDrawer}>
            取消
          </Button>
          <Button
            variant="primary"
            className="flex-grow"
            disabled={!newKeyName.trim() || !!generatedKey}
            onClick={handleGenerateKey}
          >
            {generatedKey ? '已成功生成' : '立即生成'}
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
