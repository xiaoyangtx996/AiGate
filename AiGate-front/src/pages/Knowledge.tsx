import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Database,
  HardDrive,
  Users,
  Bot,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KnowledgeBase {
  id: string
  name: string
  description: string
  docCount: number
  vectorCount: number
  storageUsed: string
  storagePercent: number
  members: number
  agentCount: number
  searchCount30d: number
  owner: string
  department: string
  visibility: 'my' | 'department' | 'all'
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'kb-001',
    name: 'AiGate v2.0 设计文档',
    description: '产品设计、UI 规范、架构分析等核心文档。',
    docCount: 28,
    vectorCount: 156000,
    storageUsed: '1.2 GB',
    storagePercent: 76,
    members: 12,
    agentCount: 1,
    searchCount30d: 432,
    owner: '张三',
    department: '北京研发中心',
    visibility: 'my',
    updatedAt: '2 小时前',
  },
  {
    id: 'kb-002',
    name: 'SLA 运维手册',
    description: '生产环境运维规范、故障处理流程、应急预案。',
    docCount: 45,
    vectorCount: 230000,
    storageUsed: '2.1 GB',
    storagePercent: 52,
    members: 8,
    agentCount: 2,
    searchCount30d: 891,
    owner: '李四',
    department: '北京研发中心',
    visibility: 'my',
    updatedAt: '1 天前',
  },
  {
    id: 'kb-003',
    name: '研发规章手册',
    description: '代码规范、Code Review 流程、发布标准。',
    docCount: 18,
    vectorCount: 89000,
    storageUsed: '0.8 GB',
    storagePercent: 34,
    members: 20,
    agentCount: 1,
    searchCount30d: 215,
    owner: '王五',
    department: '技术管理部',
    visibility: 'department',
    updatedAt: '3 天前',
  },
  {
    id: 'kb-004',
    name: '财务归档知识库',
    description: '财务报销制度、预算管理、审计合规文档。',
    docCount: 62,
    vectorCount: 310000,
    storageUsed: '3.4 GB',
    storagePercent: 88,
    members: 5,
    agentCount: 0,
    searchCount30d: 67,
    owner: '赵六',
    department: '财务部',
    visibility: 'department',
    updatedAt: '5 天前',
  },
  {
    id: 'kb-005',
    name: '产品设计文档库',
    description: '竞品分析、用户调研、交互规范、设计系统。',
    docCount: 35,
    vectorCount: 178000,
    storageUsed: '1.6 GB',
    storagePercent: 61,
    members: 15,
    agentCount: 1,
    searchCount30d: 546,
    owner: '孙七',
    department: '产品部',
    visibility: 'all',
    updatedAt: '12 小时前',
  },
  {
    id: 'kb-006',
    name: 'API 接口设计手册',
    description: 'RESTful 规范、网关配置、鉴权方案。',
    docCount: 12,
    vectorCount: 56000,
    storageUsed: '0.5 GB',
    storagePercent: 21,
    members: 10,
    agentCount: 1,
    searchCount30d: 328,
    owner: '张三',
    department: '北京研发中心',
    visibility: 'all',
    updatedAt: '4 天前',
  },
]

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

function computeStats(bases: KnowledgeBase[]) {
  return {
    totalBases: bases.length,
    totalDocs: bases.reduce((s, b) => s + b.docCount, 0),
    totalVectors: bases.reduce((s, b) => s + b.vectorCount, 0),
    totalSearches: bases.reduce((s, b) => s + b.searchCount30d, 0),
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatVectors(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return String(n)
}

function storageBarColor(percent: number): string {
  if (percent >= 80) return 'var(--brand-accent)'
  return 'var(--brand-main)'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Knowledge() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('my')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newVisibility, setNewVisibility] = useState<'my' | 'department' | 'all'>('my')

  const tabs = [
    { id: 'my', label: '我的项目', count: KNOWLEDGE_BASES.filter((b) => b.visibility === 'my').length },
    { id: 'department', label: '部门可见', count: KNOWLEDGE_BASES.filter((b) => b.visibility === 'department').length },
    { id: 'all', label: '全部', count: KNOWLEDGE_BASES.length },
  ]

  const filtered = useMemo(() => {
    return KNOWLEDGE_BASES.filter((kb) => {
      const matchesTab = activeTab === 'all' || kb.visibility === activeTab
      const matchesSearch =
        !search ||
        kb.name.toLowerCase().includes(search.toLowerCase()) ||
        kb.description.toLowerCase().includes(search.toLowerCase())
      return matchesTab && matchesSearch
    })
  }, [activeTab, search])

  const stats = useMemo(() => computeStats(KNOWLEDGE_BASES), [])

  const handleCreate = () => {
    if (!newName.trim()) return
    setShowCreate(false)
    setNewName('')
    setNewDesc('')
    setNewVisibility('my')
  }

  return (
    <div>
      <PageHeader
        title="知识库"
        subtitle="项目级强隔离知识数据，支持 RAG 检索、Agent 绑定与文档权限管控。"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setShowCreate(true)}
          >
            新建项目知识库
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '知识库总数', value: stats.totalBases, icon: <BookOpen size={20} /> },
          { label: '文档总数', value: stats.totalDocs, icon: <FileText size={20} /> },
          { label: '向量总数', value: formatVectors(stats.totalVectors), icon: <Database size={20} /> },
          { label: '本月检索', value: stats.totalSearches.toLocaleString(), icon: <BarChart3 size={20} /> },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-main) 12%, transparent)',
                color: 'var(--brand-main)',
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-secondary">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input-base text-sm pl-10 w-full"
            placeholder="搜索知识库..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="暂无知识库"
          description="当前筛选条件下没有找到知识库，请尝试切换 Tab 或新建一个。"
          action={{ label: '新建项目知识库', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((kb) => (
            <Card
              key={kb.id}
              hover
              className="p-5 flex flex-col gap-4 cursor-pointer"
              onClick={() => navigate(`/knowledge/${kb.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--brand-main) 12%, transparent)',
                      color: 'var(--brand-main)',
                    }}
                  >
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{kb.name}</div>
                    <div className="text-xs text-secondary mt-0.5">{kb.department}</div>
                  </div>
                </div>
                <Badge
                  variant={kb.visibility === 'my' ? 'success' : kb.visibility === 'department' ? 'info' : 'neutral'}
                >
                  {kb.visibility === 'my' ? '我的' : kb.visibility === 'department' ? '部门' : '全部'}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-secondary line-clamp-2">{kb.description}</p>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold">{kb.docCount}</div>
                  <div className="text-xs text-secondary">文档</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{formatVectors(kb.vectorCount)}</div>
                  <div className="text-xs text-secondary">向量</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{kb.searchCount30d}</div>
                  <div className="text-xs text-secondary">月检索</div>
                </div>
              </div>

              {/* Storage Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-secondary flex items-center gap-1">
                    <HardDrive size={12} />
                    存储使用
                  </span>
                  <span className="font-mono">{kb.storagePercent}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${kb.storagePercent}%`,
                      backgroundColor: storageBarColor(kb.storagePercent),
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between pt-3 border-t text-xs"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-3 text-secondary">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {kb.members} 人
                  </span>
                  <span className="flex items-center gap-1">
                    <Bot size={12} />
                    {kb.agentCount} Agent
                  </span>
                </div>
                <span className="flex items-center gap-1 text-brand-main font-bold">
                  管理
                  <ArrowRight size={12} />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="新建项目知识库"
        description="创建项目级知识库，为不同项目划定知识隔离边界。"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
              知识库名称
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="例如：AiGate v2.0 设计文档"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
              描述
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="简要描述知识库的用途与内容范围"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
              可见范围
            </label>
            <select
              className="input-base"
              value={newVisibility}
              onChange={(e) => setNewVisibility(e.target.value as 'my' | 'department' | 'all')}
            >
              <option value="my">仅本项目成员</option>
              <option value="department">本部门可见</option>
              <option value="all">全公司可见</option>
            </select>
          </div>
        </div>

        <div
          className="mt-6 pt-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            创建知识库
          </Button>
        </div>
      </Modal>
    </div>
  )
}
