import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Upload,
  Search,
  Bot,
  MessageSquare,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface DocItem {
  id: string
  name: string
  size: string
  chunks: number
  uploadedAt: string
  status: 'success' | 'parsing' | 'error'
}

const initialDocs: DocItem[] = [
  {
    id: 'kb-doc-1',
    name: '生产环境数据库治理规范.pdf',
    size: '2.4 MB',
    chunks: 142,
    uploadedAt: '2小时前',
    status: 'success',
  },
  {
    id: 'kb-doc-2',
    name: '架构委员会索引规范_V3.pdf',
    size: '1.1 MB',
    chunks: 68,
    uploadedAt: '1天前',
    status: 'success',
  },
]

export default function KnowledgeDetail() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'docs' | 'rag' | 'agents'>('docs')
  const [docs, setDocs] = useState<DocItem[]>(initialDocs)
  const [searchQuery, setSearchQuery] = useState('')

  // RAG settings state
  const [chunkSize, setChunkSize] = useState(500)
  const [overlap, setOverlap] = useState(50)
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-large')

  const tabs = [
    { id: 'docs' as const, label: '文档管理' },
    { id: 'rag' as const, label: 'RAG 策略调试' },
    { id: 'agents' as const, label: '关联智能体' },
  ]

  const handleUpload = () => {
    const name = '前端页面状态缓存设计指南.docx'
    const newDoc: DocItem = {
      id: `kb-doc-${Math.floor(Math.random() * 90) + 10}`,
      name,
      size: '420.5 KB',
      chunks: 24,
      uploadedAt: '刚刚',
      status: 'success',
    }
    setDocs((prev) => [newDoc, ...prev])
    alert(`「${name}」文件上传且 Milvus 向量分块提取成功！已生成 24 个安全加密的文本片段。`)
  }

  const handleDelete = (id: string) => {
    if (confirm('确认将此文档从强隔离向量库中移除吗？此操作不可逆。')) {
      setDocs((prev) => prev.filter((d) => d.id !== id))
    }
  }

  const handleSaveRagPolicy = () => {
    alert('RAG 策略已成功保存！后台正在自动异步重构索引向量块。')
  }

  return (
    <div>
      <PageHeader
        title="北京研发中心专属库"
        subtitle="项目级强物理隔离的知识数据，专用于支持架构组智能体做合规查询与溯源。"
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
        <Badge variant="neutral">RAG KB</Badge>
      </PageHeader>

      {/* Tab navigation */}
      <div
        className="flex gap-4 border-b mb-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 font-bold text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--brand-main)] text-[var(--brand-main)]'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Document management */}
      {activeTab === 'docs' && (
        <div className="space-y-6">
          <div
            className="flex justify-between items-center p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="text-sm text-secondary">
              拖拽或选择文件上传到此强物理隔离的 Milvus 分组。
            </div>
            <Button size="sm" onClick={handleUpload}>
              <Upload size={14} className="mr-1.5" />
              选择并上传文档
            </Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead
                className="border-b"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <tr>
                  <th className="p-4">文档名称</th>
                  <th className="p-4">大小</th>
                  <th className="p-4">向量块数量</th>
                  <th className="p-4">上传时间</th>
                  <th className="p-4">分块状态</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="p-4 font-bold flex items-center gap-2">
                      <FileText size={16} className="text-secondary" />
                      {doc.name}
                    </td>
                    <td className="p-4 text-secondary">{doc.size}</td>
                    <td className="p-4 font-mono">{doc.chunks} 块</td>
                    <td className="p-4 text-secondary">{doc.uploadedAt}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          doc.status === 'success'
                            ? 'success'
                            : doc.status === 'parsing'
                              ? 'warning'
                              : 'error'
                        }
                      >
                        {doc.status === 'success'
                          ? '解析成功'
                          : doc.status === 'parsing'
                            ? '解析中'
                            : '解析失败'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        className="text-[var(--brand-accent)] font-bold hover:underline"
                        onClick={() => handleDelete(doc.id)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-secondary">
                      暂无文档
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Tab: RAG policy debugging */}
      {activeTab === 'rag' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              切片与分块设置 (Chunking Policy)
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-secondary uppercase block mb-1">
                    分块大小 (Chunk Size)
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-secondary uppercase block mb-1">
                    重叠 Token数 (Overlap)
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
                  文本嵌入模型 (Embedding LLM)
                </label>
                <select
                  className="input-base"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                >
                  <option value="text-embedding-3-large">text-embedding-3-large</option>
                  <option value="bge-large-zh-v1.5">bge-large-zh-v1.5</option>
                </select>
              </div>
            </div>
            <Button className="w-full" size="sm" onClick={handleSaveRagPolicy}>
              保存切片规则
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              实时召回预览 (Retrieval Debugger)
            </h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="输入搜索词测试召回，例如：SQL慢查询"
                className="input-base text-xs pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="secondary" className="w-full" size="sm">
              运行调试检索
            </Button>
          </Card>
        </div>
      )}

      {/* Tab: Related agents */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-secondary">
              正在消费该知识库的智能体
            </h3>
            <div className="space-y-3">
              <div
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <Bot size={18} className="text-[var(--brand-main)]" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">SQL 调优助理</div>
                    <div className="text-xs text-secondary mt-0.5">
                      底座模型: gpt-4o &middot; 状态: 正常
                    </div>
                  </div>
                </div>
                <Button variant="secondary" size="sm">
                  <MessageSquare size={14} className="mr-1.5" />
                  去对话联调
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
