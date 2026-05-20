import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Upload,
  Search,
  Bot,
  MessageSquare,
  Trash2,
  Download,
  Clock,
  Users,
  Shield,
  Database,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  BarChart3,
  HardDrive,
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DocItem {
  id: string
  name: string
  size: string
  chunks: number
  uploadedAt: string
  status: 'success' | 'parsing' | 'error'
  permission: 'open' | 'restricted'
}

interface MemberItem {
  id: string
  name: string
  role: string
  permission: 'read' | 'write' | 'admin'
}

interface AgentItem {
  id: string
  name: string
  model: string
  status: 'running' | 'draft' | 'error'
  searchCount30d: number
}

interface SearchResult {
  id: string
  docName: string
  chunk: string
  score: number
  page: string
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_DOCS: DocItem[] = [
  {
    id: 'kb-doc-1',
    name: '生产环境数据库治理规范.pdf',
    size: '2.4 MB',
    chunks: 142,
    uploadedAt: '2 小时前',
    status: 'success',
    permission: 'open',
  },
  {
    id: 'kb-doc-2',
    name: '架构委员会索引规范_V3.pdf',
    size: '1.1 MB',
    chunks: 68,
    uploadedAt: '1 天前',
    status: 'success',
    permission: 'open',
  },
  {
    id: 'kb-doc-3',
    name: 'SQL 慢查询治理方案.docx',
    size: '890 KB',
    chunks: 45,
    uploadedAt: '3 天前',
    status: 'parsing',
    permission: 'restricted',
  },
  {
    id: 'kb-doc-4',
    name: '网关限流熔断设计_v2.pdf',
    size: '3.2 MB',
    chunks: 210,
    uploadedAt: '5 天前',
    status: 'success',
    permission: 'open',
  },
  {
    id: 'kb-doc-5',
    name: '缓存策略与一致性分析.pdf',
    size: '1.8 MB',
    chunks: 96,
    uploadedAt: '1 周前',
    status: 'error',
    permission: 'restricted',
  },
]

const MOCK_MEMBERS: MemberItem[] = [
  { id: 'm1', name: '张三', role: '项目负责人', permission: 'admin' },
  { id: 'm2', name: '李四', role: '后端开发', permission: 'write' },
  { id: 'm3', name: '王五', role: '前端开发', permission: 'write' },
  { id: 'm4', name: '赵六', role: '架构师', permission: 'read' },
  { id: 'm5', name: '孙七', role: '测试工程师', permission: 'read' },
]

const MOCK_AGENTS: AgentItem[] = [
  { id: 'a1', name: 'SQL 调优助理', model: 'gpt-4o', status: 'running', searchCount30d: 328 },
  { id: 'a2', name: '架构合规审查员', model: 'claude-sonnet-4-20250514', status: 'running', searchCount30d: 156 },
]

const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: 'r1',
    docName: '生产环境数据库治理规范.pdf',
    chunk: '对于超过 1s 的慢查询，必须在架构评审会上说明原因并提交优化方案。索引创建需经 DBA 审批，避免冗余索引导致写入性能下降。',
    score: 0.94,
    page: '第 12 页',
  },
  {
    id: 'r2',
    docName: 'SQL 慢查询治理方案.docx',
    chunk: '慢查询日志采集阈值设为 500ms，每日凌晨自动汇总 Top 50 慢查询清单，推送至研发群通知相关负责人。',
    score: 0.89,
    page: '第 5 页',
  },
  {
    id: 'r3',
    docName: '架构委员会索引规范_V3.pdf',
    chunk: '联合索引遵循最左前缀原则，单表索引数量不超过 5 个。禁止在 WHERE 条件中对索引列使用函数。',
    score: 0.82,
    page: '第 8 页',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function KnowledgeDetail() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('docs')
  const [docs, setDocs] = useState<DocItem[]>(INITIAL_DOCS)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: string; docId?: string } | null>(null)

  // RAG settings
  const [chunkSize, setChunkSize] = useState(512)
  const [overlap, setOverlap] = useState(50)
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-large')
  const [recallStrategy, setRecallStrategy] = useState('hybrid')
  const [rerankModel, setRerankModel] = useState('bge-reranker-large')
  const [topK, setTopK] = useState(5)

  const tabs = [
    { id: 'docs', label: '文档', icon: <FileText size={14} /> },
    { id: 'permissions', label: '权限', icon: <Shield size={14} /> },
    { id: 'retrieval', label: '检索测试', icon: <Search size={14} /> },
    { id: 'agents', label: 'Agent 绑定', icon: <Bot size={14} /> },
    { id: 'rag', label: 'RAG 策略', icon: <Settings size={14} /> },
    { id: 'stats', label: '用量统计', icon: <BarChart3 size={14} /> },
  ]

  const handleUpload = () => {
    const name = '前端页面状态缓存设计指南.docx'
    const newDoc: DocItem = {
      id: `kb-doc-${Math.floor(Math.random() * 900) + 100}`,
      name,
      size: '420.5 KB',
      chunks: 24,
      uploadedAt: '刚刚',
      status: 'success',
      permission: 'open',
    }
    setDocs((prev) => [newDoc, ...prev])
  }

  const handleDelete = (id: string) => {
    setConfirmAction({ type: 'delete', docId: id })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'delete' && confirmAction.docId) {
      setDocs((prev) => prev.filter((d) => d.id !== confirmAction.docId))
    }
    setConfirmAction(null)
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setTimeout(() => {
      setSearchResults(MOCK_SEARCH_RESULTS)
      setIsSearching(false)
    }, 800)
  }

  const handleSaveRagPolicy = () => {
    alert('RAG 策略已保存，后台正在异步重构索引向量块。')
  }

  return (
    <div>
      <PageHeader
        title="北京研发中心专属库"
        subtitle="项目级强隔离知识数据，专用于支持架构组智能体做合规查询与溯源。"
        breadcrumbs={[
          { label: '知识库', path: '/knowledge' },
          { label: '北京研发中心专属库' },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/knowledge')}>
            <ArrowLeft size={18} />
          </Button>
        }
      >
        <div className="flex items-center gap-3 text-sm text-secondary">
          <span className="flex items-center gap-1">
            <FileText size={14} />
            {docs.length} 文档
          </span>
          <span className="flex items-center gap-1">
            <Database size={14} />
            {docs.reduce((s, d) => s + d.chunks, 0)} 向量块
          </span>
          <span className="flex items-center gap-1">
            <Users size={14} />
            {MOCK_MEMBERS.length} 成员
          </span>
          <span className="flex items-center gap-1">
            <Bot size={14} />
            {MOCK_AGENTS.length} Agent
          </span>
          <Badge variant="success">RAG KB</Badge>
        </div>
      </PageHeader>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title="确认删除文档"
        description="确认将此文档从向量库中移除吗？删除后相关向量块将被清除，此操作不可逆。"
        confirmText="删除"
        variant="danger"
      />

      {/* Tab Navigation */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* ================================================================ */}
      {/*  Tab: Documents                                                   */}
      {/* ================================================================ */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          {/* Upload Bar */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Upload size={16} className="text-brand-main" />
              拖拽或选择文件上传至强隔离 Milvus 向量分组
            </div>
            <Button size="sm" onClick={handleUpload}>
              <Upload size={14} className="mr-1.5" />
              选择并上传文档
            </Button>
          </div>

          {/* Document Table */}
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead
                className="border-b text-xs text-secondary uppercase tracking-wider"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <tr>
                  <th className="p-3 pl-4">文档名称</th>
                  <th className="p-3">大小</th>
                  <th className="p-3">向量块</th>
                  <th className="p-3">权限</th>
                  <th className="p-3">上传时间</th>
                  <th className="p-3">状态</th>
                  <th className="p-3 text-right pr-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-secondary" />
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-secondary">{doc.size}</td>
                    <td className="p-3 font-mono">{doc.chunks} 块</td>
                    <td className="p-3">
                      <Badge variant={doc.permission === 'open' ? 'success' : 'warning'}>
                        {doc.permission === 'open' ? '开放' : '受限'}
                      </Badge>
                    </td>
                    <td className="p-3 text-secondary">{doc.uploadedAt}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {doc.status === 'success' && (
                          <>
                            <CheckCircle2 size={14} className="text-brand-main" />
                            <span className="text-xs">已就绪</span>
                          </>
                        )}
                        {doc.status === 'parsing' && (
                          <>
                            <RefreshCw size={14} className="text-brand-accent animate-spin" />
                            <span className="text-xs text-brand-accent">解析中</span>
                          </>
                        )}
                        {doc.status === 'error' && (
                          <>
                            <AlertTriangle size={14} className="text-brand-accent" />
                            <span className="text-xs text-brand-accent">解析失败</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right pr-4">
                      <button className="text-brand-main font-bold text-xs hover:underline mr-3 inline-flex items-center gap-1">
                        <Download size={12} />
                        下载
                      </button>
                      <button
                        className="text-brand-accent font-bold text-xs hover:underline inline-flex items-center gap-1"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 size={12} />
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-secondary">
                      暂无文档，请上传文件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Processing Timeline */}
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Clock size={16} />
              文档处理流水线
            </h3>
            <div className="flex items-center gap-2 text-xs overflow-x-auto pb-2">
              {['已上传', '解析中', '分块完成', '向量化中', '已就绪'].map((step, i) => {
                const isActive = i <= 3
                return (
                  <div key={step} className="flex items-center gap-2 shrink-0">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                      style={{
                        borderColor: isActive ? 'var(--brand-main)' : 'var(--border-color)',
                        backgroundColor: isActive
                          ? 'color-mix(in srgb, var(--brand-main) 10%, transparent)'
                          : 'transparent',
                        color: isActive ? 'var(--brand-main)' : 'var(--text-secondary)',
                      }}
                    >
                      {isActive && <CheckCircle2 size={12} />}
                      {step}
                    </div>
                    {i < 4 && (
                      <div
                        className="w-6 h-px"
                        style={{ backgroundColor: isActive ? 'var(--brand-main)' : 'var(--border-color)' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Tab: Permissions                                                 */}
      {/* ================================================================ */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Shield size={16} />
                成员权限矩阵
              </h3>
              <Button variant="secondary" size="sm">
                <Users size={14} className="mr-1.5" />
                添加成员
              </Button>
            </div>

            <table className="w-full text-left text-sm">
              <thead
                className="border-b text-xs text-secondary uppercase tracking-wider"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <tr>
                  <th className="p-3 pl-4">成员</th>
                  <th className="p-3">角色</th>
                  <th className="p-3">知识库权限</th>
                  <th className="p-3 text-right pr-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {MOCK_MEMBERS.map((member) => (
                  <tr key={member.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="p-3 pl-4 font-medium">{member.name}</td>
                    <td className="p-3 text-secondary">{member.role}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          member.permission === 'admin'
                            ? 'info'
                            : member.permission === 'write'
                              ? 'success'
                              : 'neutral'
                        }
                      >
                        {member.permission === 'admin'
                          ? '管理员'
                          : member.permission === 'write'
                            ? '读写'
                            : '只读'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right pr-4">
                      <button className="text-brand-main text-xs font-bold hover:underline">
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Tab: Retrieval Test                                              */}
      {/* ================================================================ */}
      {activeTab === 'retrieval' && (
        <div className="space-y-4">
          {/* Search Input */}
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Search size={16} />
              检索测试
              <Badge variant="neutral">模拟 RAG Query</Badge>
            </h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  className="input-base text-sm pl-10 w-full"
                  placeholder="输入查询语句，例如：SQL 慢查询如何处理？"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} loading={isSearching}>
                <Play size={14} className="mr-1.5" />
                运行检索
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-secondary">
              <span>Top-K: {topK}</span>
              <span>召回策略: {recallStrategy === 'hybrid' ? '混合检索' : '纯向量'}</span>
              <span>Rerank: {rerankModel === 'none' ? '未启用' : rerankModel}</span>
            </div>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                命中结果
                <Badge variant="success">{searchResults.length} 条</Badge>
              </h3>
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 rounded-lg border"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-brand-main" />
                        <span className="text-sm font-bold">{result.docName}</span>
                        <span className="text-xs text-secondary">{result.page}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-secondary">相关度</span>
                        <span
                          className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                          style={{
                            backgroundColor:
                              result.score >= 0.9
                                ? 'color-mix(in srgb, var(--brand-main) 15%, transparent)'
                                : 'color-mix(in srgb, var(--brand-accent) 15%, transparent)',
                            color: result.score >= 0.9 ? 'var(--brand-main)' : 'var(--brand-accent)',
                          }}
                        >
                          {(result.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">{result.chunk}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <Card className="p-8 text-center text-secondary">
              <Search size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">未找到匹配结果，请尝试调整查询关键词。</p>
            </Card>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  Tab: Agent Binding                                               */}
      {/* ================================================================ */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Bot size={16} />
              已绑定 Agent
              <Badge variant="neutral">{MOCK_AGENTS.length} 个</Badge>
            </h3>
            <div className="space-y-3">
              {MOCK_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--brand-main) 12%, transparent)',
                        color: 'var(--brand-main)',
                      }}
                    >
                      <Bot size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{agent.name}</div>
                      <div className="text-xs text-secondary mt-0.5">
                        模型: {agent.model}
                        <span className="mx-1.5">&middot;</span>
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: agent.status === 'running' ? 'var(--brand-main)' : 'var(--brand-accent)' }}
                        >
                          {agent.status === 'running' ? '运行中' : agent.status === 'draft' ? '草稿' : '异常'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold">{agent.searchCount30d}</div>
                      <div className="text-xs text-secondary">本月检索次数</div>
                    </div>
                    <Button variant="secondary" size="sm">
                      <MessageSquare size={14} className="mr-1.5" />
                      对话联调
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Plus size={16} />
              绑定新 Agent
            </h3>
            <p className="text-xs text-secondary mb-4">
              将此知识库关联到 Agent，Agent 可在对话中自动检索本库文档。
            </p>
            <Button variant="secondary">
              <Bot size={14} className="mr-1.5" />
              选择 Agent 进行绑定
            </Button>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Tab: RAG Strategy                                                */}
      {/* ================================================================ */}
      {activeTab === 'rag' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chunking */}
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              切片与分块设置
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-secondary uppercase block mb-1">
                    分块大小 (Tokens)
                  </label>
                  <select
                    className="input-base"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                  >
                    <option value={256}>256</option>
                    <option value={512}>512</option>
                    <option value={1024}>1024</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-secondary uppercase block mb-1">
                    重叠 Token 数
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    value={overlap}
                    onChange={(e) => setOverlap(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  嵌入模型
                </label>
                <select
                  className="input-base"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                >
                  <option value="text-embedding-3-large">text-embedding-3-large</option>
                  <option value="bge-m3">bge-m3</option>
                  <option value="bge-large-zh-v1.5">bge-large-zh-v1.5</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Retrieval */}
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              召回与排序
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  召回策略
                </label>
                <select
                  className="input-base"
                  value={recallStrategy}
                  onChange={(e) => setRecallStrategy(e.target.value)}
                >
                  <option value="hybrid">混合检索 (向量 + BM25)</option>
                  <option value="vector">纯向量检索</option>
                  <option value="bm25">纯 BM25 检索</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  Rerank 模型
                </label>
                <select
                  className="input-base"
                  value={rerankModel}
                  onChange={(e) => setRerankModel(e.target.value)}
                >
                  <option value="bge-reranker-large">bge-reranker-large</option>
                  <option value="cohere-rerank-v3">cohere-rerank-v3</option>
                  <option value="none">不启用</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase block mb-1">
                  Top-K 召回数
                </label>
                <input
                  type="number"
                  className="input-base"
                  value={topK}
                  min={1}
                  max={20}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
              </div>
            </div>
          </Card>

          {/* Save */}
          <div className="lg:col-span-2">
            <Button variant="primary" onClick={handleSaveRagPolicy}>
              保存 RAG 策略
            </Button>
            <span className="text-xs text-secondary ml-3">
              保存后将自动异步重构索引向量块
            </span>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Tab: Usage Stats                                                 */}
      {/* ================================================================ */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '本月检索次数', value: '2,486', change: '+12%', up: true },
              { label: '消耗 Token 数', value: '1.2M', change: '+8%', up: true },
              { label: '存储使用', value: '3.8 GB', change: '+0.2 GB', up: true },
              { label: '平均相关度', value: '87.3%', change: '+2.1%', up: true },
            ].map((stat) => (
              <Card key={stat.label} className="p-4">
                <div className="text-xs text-secondary mb-1">{stat.label}</div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div
                  className="text-xs mt-1 font-bold"
                  style={{ color: stat.up ? 'var(--brand-main)' : 'var(--brand-accent)' }}
                >
                  {stat.change} 较上月
                </div>
              </Card>
            ))}
          </div>

          {/* Chart Placeholder */}
          <Card className="p-6">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart3 size={16} />
              检索次数趋势（近 30 天）
            </h3>
            <div
              className="h-48 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div className="text-center text-secondary">
                <BarChart3 size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">ECharts 图表将在生产实现阶段接入</p>
              </div>
            </div>
          </Card>

          {/* Storage Breakdown */}
          <Card className="p-6">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <HardDrive size={16} />
              存储明细
            </h3>
            <div className="space-y-3">
              {[
                { label: '向量数据', size: '2.1 GB', percent: 55 },
                { label: '原始文档', size: '1.2 GB', percent: 32 },
                { label: '索引元数据', size: '0.5 GB', percent: 13 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-secondary">{item.label}</span>
                    <span className="font-mono">{item.size}</span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: 'var(--brand-main)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
