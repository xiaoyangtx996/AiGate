import { useState } from 'react'
import { GitBranch, Layers, MessageSquare, Mail, Plus, Settings, Pencil, Puzzle, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'

interface McpTool {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  protocol: 'MCP:REMOTE' | 'MCP:LOCAL'
  auth: string
  status: 'enabled' | 'disabled'
  calls7d: string
  isPublic: boolean
}

const MOCK_TOOLS: McpTool[] = [
  {
    id: '1',
    name: 'GitHub API',
    description: '支持代码库搜索、Issue 管理、PR 审查等操作。',
    icon: <GitBranch size={22} />,
    protocol: 'MCP:REMOTE',
    auth: 'OAuth',
    status: 'enabled',
    calls7d: '1.2k',
    isPublic: true,
  },
  {
    id: '2',
    name: '飞书文档读写',
    description: '读取/写入飞书文档、电子表格、多维表格。',
    icon: <Layers size={22} />,
    protocol: 'MCP:REMOTE',
    auth: 'AppToken',
    status: 'enabled',
    calls7d: '856',
    isPublic: true,
  },
  {
    id: '3',
    name: '数据库查询',
    description: '只读查询企业内部 PostgreSQL，用于数据统计辅助。',
    icon: <MessageSquare size={22} />,
    protocol: 'MCP:LOCAL',
    auth: '只读',
    status: 'enabled',
    calls7d: '3.4k',
    isPublic: false,
  },
  {
    id: '4',
    name: '邮件发送',
    description: '通过 SMTP 发送邮件，供 Agent 执行通知任务。',
    icon: <Mail size={22} />,
    protocol: 'MCP:LOCAL',
    auth: 'SMTP',
    status: 'disabled',
    calls7d: '0',
    isPublic: false,
  },
]

const TABS = [
  { id: 'public', label: '公共市场', count: MOCK_TOOLS.filter((t) => t.isPublic).length },
  { id: 'private', label: '企业私有库', count: MOCK_TOOLS.filter((t) => !t.isPublic).length },
  { id: 'stats', label: '调用统计' },
]

export default function Mcp() {
  const [activeTab, setActiveTab] = useState('public')
  const [modalOpen, setModalOpen] = useState(false)
  const [protocol, setProtocol] = useState<'stdio' | 'sse'>('stdio')
  const [toolName, setToolName] = useState('')
  const [search, setSearch] = useState('')
  const { addToast } = useUIStore()

  const filteredTools = MOCK_TOOLS.filter((tool) => {
    const matchesTab = activeTab === 'public' ? tool.isPublic : activeTab === 'private' ? !tool.isPublic : true
    const matchesSearch = !search || tool.name.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  const handleRegister = () => {
    if (!toolName.trim()) {
      addToast({ type: 'warning', title: '请输入 MCP 工具名称' })
      return
    }
    addToast({ type: 'success', title: '注册成功', message: `MCP 工具「${toolName}」已成功注册` })
    setModalOpen(false)
    setToolName('')
  }

  return (
    <div>
      <PageHeader
        title="MCP 工具市场"
        subtitle="注册符合 Model Context Protocol 的工具，供 Agent 动态调用。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'MCP 工具' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            注册工具
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Search bar */}
      <div className="mb-6">
        <Input
          placeholder="搜索 MCP 工具..."
          icon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Tool Grid */}
      {filteredTools.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="暂无 MCP 工具"
          description={activeTab === 'public' ? '公共市场暂无可用工具' : '还没有注册任何私有工具'}
          action={activeTab === 'private' ? { label: '注册工具', onClick: () => setModalOpen(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <Card key={tool.id} hover className="flex flex-col hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl border flex items-center justify-center"
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--brand-main)',
                  }}
                >
                  {tool.icon}
                </div>
                <Badge variant={tool.status === 'enabled' ? 'success' : 'warning'}>
                  {tool.status === 'enabled' ? '已启用' : '已停用'}
                </Badge>
              </div>
              <h3 className="font-bold text-base mb-1">{tool.name}</h3>
              <p className="text-secondary text-sm flex-1 mb-4">{tool.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge-neutral text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-color)' }}>{tool.protocol}</span>
                <span className="badge-neutral text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border-color)' }}>认证: {tool.auth}</span>
              </div>
              <div
                className="flex justify-between items-center border-t pt-4 mt-auto"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="text-xs text-secondary">
                  近7天调用:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{tool.calls7d}</strong>
                </span>
                <div className="flex gap-3">
                  <button className="text-xs font-bold text-secondary hover:text-primary cursor-pointer">
                    <Pencil size={12} className="inline mr-1" />
                    编辑
                  </button>
                  <button className="text-xs font-bold text-brand-main hover:underline cursor-pointer">
                    <Settings size={12} className="inline mr-1" />
                    配置
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="注册新 MCP 工具"
        description="支持 Model Context Protocol 规范的 stdio 命令行二进制、HTTP SSE 端点及安全隔离运行。"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="工具名称"
              placeholder="例如：Slack Connector"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
            />
            <div className="w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                连接器协议
              </label>
              <select
                className="input"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as 'stdio' | 'sse')}
              >
                <option value="stdio">Local Stdio (命令行二进制)</option>
                <option value="sse">Remote SSE (HTTP Server-Sent Events)</option>
              </select>
            </div>
          </div>
          {protocol === 'stdio' ? (
            <Input label="启动命令" placeholder="例如：npx @anthropic/mcp-github" />
          ) : (
            <Input label="服务 URL" placeholder="例如：https://api.example.com/mcp" />
          )}
          <Input label="认证 Token" placeholder="请输入访问凭证（可选）" />
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>沙箱策略</label>
              <select className="input"><option>严格隔离（只读文件系统）</option></select>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>可见范围</label>
              <select className="input"><option>全员可用</option></select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
          <Button onClick={handleRegister}>提交注册</Button>
        </div>
      </Modal>
    </div>
  )
}
