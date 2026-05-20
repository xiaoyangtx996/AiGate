import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  Folder,
  Lock,
  Search,
  Upload,
  FileText,
  Download,
  Trash2,
  FolderPlus,
  Settings,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FolderItem {
  id: string
  name: string
  locked: boolean
}

interface FileItem {
  id: string
  name: string
  size: string
  vectorStatus: 'done' | 'processing' | 'pending'
  updatedAt: string
  uploader: string
}

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const folders: FolderItem[] = [
  { id: 'all', name: '全部文件', locked: false },
  { id: 'rd', name: '研发规章手册', locked: true },
  { id: 'product', name: '产品设计文档', locked: false },
  { id: 'sla', name: 'SLA 运维手册', locked: false },
  { id: 'finance', name: '财务归档', locked: true },
]

const fileList: FileItem[] = [
  {
    id: '1',
    name: 'AiGate_产品需求文档_v2.0.pdf',
    size: '2.4 MB',
    vectorStatus: 'done',
    updatedAt: '2026-04-28',
    uploader: '张三',
  },
  {
    id: '2',
    name: 'UI_设计规范_2026.docx',
    size: '890 KB',
    vectorStatus: 'processing',
    updatedAt: '2026-04-29',
    uploader: '李四',
  },
  {
    id: '3',
    name: '竞品分析_2026Q1.xlsx',
    size: '1.1 MB',
    vectorStatus: 'done',
    updatedAt: '2026-04-20',
    uploader: '王五',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Knowledge() {
  const [activeFolder, setActiveFolder] = useState('product')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderLocked, setFolderLocked] = useState<Record<string, boolean>>({
    product: false,
    sla: false,
  })

  /* New folder form */
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderPrivacy, setNewFolderPrivacy] = useState<'open' | 'locked'>(
    'open',
  )
  const [newFolderRagStrategy, setNewFolderRagStrategy] = useState(
    'auto',
  )

  /* RAG config state */
  const [chunkStrategy, setChunkStrategy] = useState('512')
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-large')
  const [recallStrategy, setRecallStrategy] = useState('hybrid')
  const [rerankModel, setRerankModel] = useState('bge-reranker-large')
  const [topK, setTopK] = useState(5)

  const currentFolder = folders.find((f) => f.id === activeFolder)

  const isFolderLocked = (id: string) => {
    if (id in folderLocked) return folderLocked[id]
    const folder = folders.find((f) => f.id === id)
    return folder?.locked ?? false
  }

  const handleToggleLock = () => {
    setFolderLocked((prev) => ({
      ...prev,
      [activeFolder]: !isFolderLocked(activeFolder),
    }))
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    setShowNewFolder(false)
    setNewFolderName('')
    setNewFolderPrivacy('open')
    setNewFolderRagStrategy('auto')
  }

  const filteredFiles = searchQuery
    ? fileList.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : fileList

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      <PageHeader
        title="知识库管理"
        subtitle="企业文档文件管理系统，支持文件夹分类、开放/锁定权限控制与 RAG 检索策略配置。"
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Settings size={16} />}
              data-roles="sys_admin,tenant_admin"
            >
              RAG 策略配置
            </Button>
            <Button
              variant="primary"
              icon={<FolderPlus size={16} />}
              onClick={() => setShowNewFolder(true)}
            >
              新建文件夹
            </Button>
          </>
        }
      />

      {/* ============================================================ */}
      {/*  Main Grid: Sidebar + Content                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ---------------------------------------------------------- */}
        {/*  Left: Folder Directory                                     */}
        {/* ---------------------------------------------------------- */}
        <Card className="col-span-1 p-0 overflow-hidden">
          <div
            className="p-4 border-b font-bold text-sm flex justify-between items-center"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <span>文件夹目录</span>
            <button
              className="text-xs text-brand-main font-bold hover:underline"
              onClick={() => setShowNewFolder(true)}
            >
              + 新建
            </button>
          </div>

          <div className="p-2">
            {/* All files */}
            <div
              className={`nav-item rounded-lg py-2 cursor-pointer ${activeFolder === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFolder('all')}
            >
              <Folder size={16} />
              <span>全部文件</span>
            </div>

            {/* Sub-folders */}
            <div className="pl-4 space-y-0.5 mt-1">
              {folders
                .filter((f) => f.id !== 'all')
                .map((folder) => (
                  <div
                    key={folder.id}
                    className={`nav-item rounded-lg py-2 text-sm cursor-pointer ${activeFolder === folder.id ? 'active' : ''}`}
                    onClick={() => setActiveFolder(folder.id)}
                  >
                    {isFolderLocked(folder.id) ? (
                      <Lock size={14} />
                    ) : (
                      <Folder size={14} />
                    )}
                    <span>{folder.name}</span>
                    <span
                      className={`ml-auto text-xs ${isFolderLocked(folder.id) ? 'text-brand-accent' : 'text-brand-main'}`}
                    >
                      {isFolderLocked(folder.id) ? '锁定' : '开放'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* ---------------------------------------------------------- */}
        {/*  Right: Content Area                                        */}
        {/* ---------------------------------------------------------- */}
        <div className="col-span-1 lg:col-span-3 space-y-4">
          {/* Search Bar */}
          <div
            className="card p-4 flex flex-wrap items-center gap-4 border-l-4"
            style={{
              borderLeftColor: 'var(--brand-main)',
              background:
                'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))',
            }}
          >
            <Search size={20} className="text-brand-main shrink-0" />
            <input
              className="input-base flex-1 min-w-48"
              placeholder="在当前文件夹中搜索文件名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="secondary" size="sm" icon={<Upload size={14} />}>
              上传文档
            </Button>
          </div>

          {/* File List */}
          <Card className="p-0 overflow-hidden">
            <div
              className="p-4 border-b flex justify-between items-center"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold">
                  {currentFolder?.name ?? '全部文件'}
                </span>
                {!isFolderLocked(activeFolder) && activeFolder !== 'all' && (
                  <Badge variant="success">开放 · AI 可读</Badge>
                )}
                {isFolderLocked(activeFolder) && (
                  <Badge variant="warning">锁定</Badge>
                )}
              </div>
              <div className="flex gap-2" data-roles="sys_admin,tenant_admin">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleLock}
                >
                  {isFolderLocked(activeFolder) ? '开放文件夹' : '锁定文件夹'}
                </Button>
                <Button variant="secondary" size="sm">
                  RAG 策略
                </Button>
              </div>
            </div>

            <table className="w-full text-left">
              <thead
                className="border-b text-xs text-secondary uppercase tracking-wider"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'rgba(0,0,0,0.05)',
                }}
              >
                <tr>
                  <th className="p-3 pl-4">文件名</th>
                  <th className="p-3">大小</th>
                  <th className="p-3">向量状态</th>
                  <th className="p-3">更新时间</th>
                  <th className="p-3">上传者</th>
                  <th className="p-3 text-right pr-4">操作</th>
                </tr>
              </thead>
              <tbody
                className="text-sm divide-y"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2">
                        <FileText
                          size={16}
                          className={
                            file.vectorStatus === 'done'
                              ? 'text-brand-main'
                              : 'text-brand-accent'
                          }
                        />
                        <span className="font-medium">{file.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-secondary">{file.size}</td>
                    <td className="p-3">
                      {file.vectorStatus === 'done' && (
                        <Badge variant="success">已向量化</Badge>
                      )}
                      {file.vectorStatus === 'processing' && (
                        <Badge variant="warning">处理中...</Badge>
                      )}
                      {file.vectorStatus === 'pending' && (
                        <Badge variant="neutral">待处理</Badge>
                      )}
                    </td>
                    <td className="p-3 text-secondary">{file.updatedAt}</td>
                    <td className="p-3 text-secondary">{file.uploader}</td>
                    <td className="p-3 text-right pr-4">
                      <button className="text-brand-main font-bold text-xs hover:underline mr-2 inline-flex items-center gap-1">
                        <Download size={12} />
                        下载
                      </button>
                      <button className="text-brand-accent font-bold text-xs hover:underline inline-flex items-center gap-1">
                        <Trash2 size={12} />
                        删除
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredFiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-secondary text-sm"
                    >
                      当前文件夹中没有匹配的文件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* -------------------------------------------------------- */}
          {/*  RAG Strategy Config                                      */}
          {/* -------------------------------------------------------- */}
          <Card className="p-6" data-roles="sys_admin,tenant_admin">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              RAG 检索策略配置
              <Badge variant="success">当前文件夹生效</Badge>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                    分块策略
                  </label>
                  <select
                    className="input-base"
                    value={chunkStrategy}
                    onChange={(e) => setChunkStrategy(e.target.value)}
                  >
                    <option value="512">512 Tokens (Overlap: 50)</option>
                    <option value="1024">1024 Tokens (Overlap: 100)</option>
                    <option value="sentence">句子级分块</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                    嵌入模型
                  </label>
                  <select
                    className="input-base"
                    value={embeddingModel}
                    onChange={(e) => setEmbeddingModel(e.target.value)}
                  >
                    <option value="text-embedding-3-large">
                      text-embedding-3-large
                    </option>
                    <option value="bge-m3">bge-m3</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                    召回策略
                  </label>
                  <select
                    className="input-base"
                    value={recallStrategy}
                    onChange={(e) => setRecallStrategy(e.target.value)}
                  >
                    <option value="hybrid">混合检索 (向量 + BM25)</option>
                    <option value="vector">纯向量检索</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                    Rerank 模型
                  </label>
                  <select
                    className="input-base"
                    value={rerankModel}
                    onChange={(e) => setRerankModel(e.target.value)}
                  >
                    <option value="bge-reranker-large">
                      bge-reranker-large
                    </option>
                    <option value="none">不启用</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                    Top-K 召回数
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <Button variant="primary" className="mt-4">
              保存策略
            </Button>
          </Card>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  New Folder Modal                                             */}
      {/* ============================================================ */}
      <Modal
        isOpen={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        title="新建知识库文件夹"
        description="创建逻辑独立的文件夹目录，为不同的 Agent 划定知识隔离边界。"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary uppercase mb-2">
              文件夹名称
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="例如：API 接口设计手册"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase mb-2">
              初始安全权限状态
            </label>
            <select
              className="input-base"
              value={newFolderPrivacy}
              onChange={(e) =>
                setNewFolderPrivacy(e.target.value as 'open' | 'locked')
              }
            >
              <option value="open">开放 (全项目 Agent 可读写)</option>
              <option value="locked">锁定 (需安全管理员单独授权可见)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase mb-2">
              AI 关联读取策略
            </label>
            <select
              className="input-base"
              value={newFolderRagStrategy}
              onChange={(e) => setNewFolderRagStrategy(e.target.value)}
            >
              <option value="auto">自动纳入 RAG 数据联邦检索</option>
              <option value="manual">仅手动勾选指定 Agent 时读取</option>
            </select>
          </div>
        </div>

        <div
          className="mt-6 pt-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Button
            variant="secondary"
            onClick={() => setShowNewFolder(false)}
          >
            取消
          </Button>
          <Button variant="primary" onClick={handleCreateFolder}>
            开始创建文件夹
          </Button>
        </div>
      </Modal>
    </div>
  )
}
