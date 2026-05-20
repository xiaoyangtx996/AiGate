import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { LineChart } from '@/components/charts/LineChart'
import {
  Home,
  Building2,
  FolderOpen,
  Users,
  Plus,
  TrendingUp,
  PieChart,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'

// -- 组织树节点数据 -------------------------------------------------------
interface OrgNode {
  id: string
  label: string
  sublabel: string
  icon: 'home' | 'building' | 'folder' | 'user'
  level: number
  accent?: boolean
  children?: string[]
}

const orgTree: OrgNode[] = [
  { id: 'root', label: '集团总部', sublabel: '(Root)', icon: 'home', level: 0, accent: true, children: ['bj', 'sh'] },
  { id: 'bj', label: '北京研发中心', sublabel: '(租户)', icon: 'building', level: 1, children: ['ai', 'frontend'] },
  { id: 'sh', label: '上海分公司', sublabel: '(租户)', icon: 'building', level: 1, children: ['sh-ai'] },
  { id: 'ai', label: 'AI 架构部', sublabel: '(部门)', icon: 'folder', level: 2, children: ['zhang', 'li'] },
  { id: 'frontend', label: '前端开发组', sublabel: '(部门)', icon: 'folder', level: 2, children: ['wang'] },
  { id: 'sh-ai', label: 'AI 产品部', sublabel: '(部门)', icon: 'folder', level: 2, children: ['chen'] },
  { id: 'zhang', label: '张三', sublabel: '(员工/3密钥)', icon: 'user', level: 3 },
  { id: 'li', label: '李四', sublabel: '(员工/1密钥)', icon: 'user', level: 3 },
  { id: 'wang', label: '王五', sublabel: '(员工/2密钥)', icon: 'user', level: 3 },
  { id: 'chen', label: '陈六', sublabel: '(员工/1密钥)', icon: 'user', level: 3 },
]

const iconMap = {
  home: Home,
  building: Building2,
  folder: FolderOpen,
  user: Users,
} as const

// -- 配额周期类型 ----------------------------------------------------------
type Period = 'month' | 'quarter' | 'year'

const periodTabs = [
  { id: 'month', label: '月' },
  { id: 'quarter', label: '季' },
  { id: 'year', label: '年' },
]

// -- 节点配额详情数据 -------------------------------------------------------
interface NodeQuota {
  fund: { used: number; total: number }
  token: { used: number; total: number }
  childrenAllocated?: { name: string; fund: number; token: number }[]
}

const quotaMap: Record<string, Record<Period, NodeQuota>> = {
  root: {
    month: {
      fund: { used: 120000, total: 500000 },
      token: { used: 42, total: 100 },
      childrenAllocated: [
        { name: '北京研发中心', fund: 180000, token: 40 },
        { name: '上海分公司', fund: 120000, token: 30 },
      ],
    },
    quarter: {
      fund: { used: 360000, total: 1500000 },
      token: { used: 126, total: 300 },
      childrenAllocated: [
        { name: '北京研发中心', fund: 540000, token: 120 },
        { name: '上海分公司', fund: 360000, token: 90 },
      ],
    },
    year: {
      fund: { used: 1440000, total: 6000000 },
      token: { used: 504, total: 1200 },
      childrenAllocated: [
        { name: '北京研发中心', fund: 2160000, token: 480 },
        { name: '上海分公司', fund: 1440000, token: 360 },
      ],
    },
  },
  bj: {
    month: {
      fund: { used: 15000, total: 50000 },
      token: { used: 4.2, total: 10 },
      childrenAllocated: [
        { name: 'AI 架构部', fund: 30000, token: 6 },
        { name: '前端开发组', fund: 10000, token: 2 },
      ],
    },
    quarter: {
      fund: { used: 45000, total: 150000 },
      token: { used: 12.6, total: 30 },
      childrenAllocated: [
        { name: 'AI 架构部', fund: 90000, token: 18 },
        { name: '前端开发组', fund: 30000, token: 6 },
      ],
    },
    year: {
      fund: { used: 180000, total: 600000 },
      token: { used: 50.4, total: 120 },
      childrenAllocated: [
        { name: 'AI 架构部', fund: 360000, token: 72 },
        { name: '前端开发组', fund: 120000, token: 24 },
      ],
    },
  },
  sh: {
    month: {
      fund: { used: 8000, total: 30000 },
      token: { used: 2.1, total: 8 },
      childrenAllocated: [
        { name: 'AI 产品部', fund: 25000, token: 6 },
      ],
    },
    quarter: {
      fund: { used: 24000, total: 90000 },
      token: { used: 6.3, total: 24 },
      childrenAllocated: [
        { name: 'AI 产品部', fund: 75000, token: 18 },
      ],
    },
    year: {
      fund: { used: 96000, total: 360000 },
      token: { used: 25.2, total: 96 },
      childrenAllocated: [
        { name: 'AI 产品部', fund: 300000, token: 72 },
      ],
    },
  },
  ai: {
    month: { fund: { used: 12000, total: 30000 }, token: { used: 3.5, total: 6 } },
    quarter: { fund: { used: 36000, total: 90000 }, token: { used: 10.5, total: 18 } },
    year: { fund: { used: 144000, total: 360000 }, token: { used: 42, total: 72 } },
  },
  frontend: {
    month: { fund: { used: 3000, total: 10000 }, token: { used: 0.7, total: 2 } },
    quarter: { fund: { used: 9000, total: 30000 }, token: { used: 2.1, total: 6 } },
    year: { fund: { used: 36000, total: 120000 }, token: { used: 8.4, total: 24 } },
  },
  'sh-ai': {
    month: { fund: { used: 6000, total: 25000 }, token: { used: 1.5, total: 6 } },
    quarter: { fund: { used: 18000, total: 75000 }, token: { used: 4.5, total: 18 } },
    year: { fund: { used: 72000, total: 300000 }, token: { used: 18, total: 72 } },
  },
  zhang: {
    month: { fund: { used: 5000, total: 10000 }, token: { used: 1.2, total: 2 } },
    quarter: { fund: { used: 15000, total: 30000 }, token: { used: 3.6, total: 6 } },
    year: { fund: { used: 60000, total: 120000 }, token: { used: 14.4, total: 24 } },
  },
  li: {
    month: { fund: { used: 2000, total: 8000 }, token: { used: 0.8, total: 1.5 } },
    quarter: { fund: { used: 6000, total: 24000 }, token: { used: 2.4, total: 4.5 } },
    year: { fund: { used: 24000, total: 96000 }, token: { used: 9.6, total: 18 } },
  },
  wang: {
    month: { fund: { used: 3000, total: 10000 }, token: { used: 0.7, total: 2 } },
    quarter: { fund: { used: 9000, total: 30000 }, token: { used: 2.1, total: 6 } },
    year: { fund: { used: 36000, total: 120000 }, token: { used: 8.4, total: 24 } },
  },
  chen: {
    month: { fund: { used: 6000, total: 25000 }, token: { used: 1.5, total: 6 } },
    quarter: { fund: { used: 18000, total: 75000 }, token: { used: 4.5, total: 18 } },
    year: { fund: { used: 72000, total: 300000 }, token: { used: 18, total: 72 } },
  },
}

// -- 历史用量数据（近 12 个月）---------------------------------------------
const historyDataMap: Record<string, { dates: string[]; series: { name: string; data: number[]; color?: string }[] }> = {
  root: {
    dates: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
    series: [
      { name: '资金 (万元)', data: [8.5, 9.2, 10.1, 11.8, 12.5, 13.0, 14.2, 10.5, 9.8, 12.0, 13.5, 14.8], color: '#10b981' },
      { name: 'Token (百万)', data: [32, 35, 38, 42, 45, 48, 52, 38, 36, 44, 48, 52], color: '#f59e0b' },
    ],
  },
  bj: {
    dates: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
    series: [
      { name: '资金 (万元)', data: [3.8, 4.2, 4.5, 5.2, 5.8, 6.0, 6.5, 4.8, 4.2, 5.5, 6.0, 6.5], color: '#10b981' },
      { name: 'Token (百万)', data: [2.8, 3.1, 3.4, 3.8, 4.0, 4.2, 4.5, 3.2, 3.0, 3.8, 4.0, 4.2], color: '#f59e0b' },
    ],
  },
  sh: {
    dates: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
    series: [
      { name: '资金 (万元)', data: [2.0, 2.3, 2.5, 2.8, 3.0, 3.2, 3.5, 2.5, 2.2, 2.8, 3.0, 3.2], color: '#10b981' },
      { name: 'Token (百万)', data: [1.5, 1.7, 1.8, 2.0, 2.1, 2.2, 2.4, 1.8, 1.6, 2.0, 2.1, 2.2], color: '#f59e0b' },
    ],
  },
  ai: {
    dates: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
    series: [
      { name: '资金 (万元)', data: [2.2, 2.5, 2.8, 3.2, 3.5, 3.8, 4.0, 3.0, 2.8, 3.5, 3.8, 4.0], color: '#10b981' },
      { name: 'Token (百万)', data: [2.0, 2.3, 2.5, 2.8, 3.0, 3.2, 3.5, 2.5, 2.3, 3.0, 3.2, 3.5], color: '#f59e0b' },
    ],
  },
  frontend: {
    dates: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
    series: [
      { name: '资金 (万元)', data: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 0.8, 0.7, 0.9, 1.0, 1.1], color: '#10b981' },
      { name: 'Token (百万)', data: [0.3, 0.4, 0.4, 0.5, 0.5, 0.6, 0.7, 0.5, 0.4, 0.5, 0.6, 0.7], color: '#f59e0b' },
    ],
  },
  'sh-ai': {
    dates: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
    series: [
      { name: '资金 (万元)', data: [1.5, 1.7, 1.8, 2.0, 2.2, 2.3, 2.5, 1.8, 1.6, 2.0, 2.2, 2.3], color: '#10b981' },
      { name: 'Token (百万)', data: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.2, 1.0, 1.3, 1.4, 1.5], color: '#f59e0b' },
    ],
  },
}

// 为叶子节点提供默认历史数据
const defaultHistoryData = {
  dates: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
  series: [
    { name: '资金 (万元)', data: [0.8, 0.9, 1.0, 1.2, 1.3, 1.4, 1.5, 1.0, 0.9, 1.2, 1.3, 1.5], color: '#10b981' },
    { name: 'Token (百万)', data: [0.5, 0.6, 0.6, 0.7, 0.8, 0.8, 0.9, 0.6, 0.5, 0.7, 0.8, 0.9], color: '#f59e0b' },
  ],
}

// -- 工具函数 ---------------------------------------------------------------
function formatCurrency(n: number): string {
  if (n >= 10000) return `¥${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万`
  return `¥${n.toLocaleString()}`
}

function formatToken(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}B`
  if (n >= 1) return `${n.toFixed(1)}M`
  return `${(n * 1000).toFixed(0)}K`
}

function getPercent(used: number, total: number): number {
  return total === 0 ? 0 : Math.round((used / total) * 100)
}

// -- 组件 -----------------------------------------------------------------
export default function Organization() {
  const navigate = useNavigate()
  const [showDrawer, setShowDrawer] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState('bj')
  const [period, setPeriod] = useState<Period>('month')
  const [parentNode, setParentNode] = useState('北京研发中心 (租户)')
  const [nodeName, setNodeName] = useState('')
  const [fundQuota, setFundQuota] = useState('')
  const [tokenQuota, setTokenQuota] = useState('')

  const selectedNode = orgTree.find((n) => n.id === selectedNodeId) ?? orgTree[1]
  const quota = quotaMap[selectedNodeId]?.[period] ?? quotaMap['bj'][period]
  const historyData = historyDataMap[selectedNodeId] ?? defaultHistoryData

  const hasChildren = Boolean(quota.childrenAllocated?.length)

  // 守恒分配计算
  const conservationData = useMemo(() => {
    if (!quota.childrenAllocated?.length) return null
    const totalAllocated = quota.childrenAllocated.reduce((s, c) => s + c.fund, 0)
    const unallocated = quota.fund.total - totalAllocated
    return {
      allocated: quota.childrenAllocated,
      totalAllocated,
      unallocated: Math.max(0, unallocated),
      total: quota.fund.total,
    }
  }, [quota])

  const periodLabel = period === 'month' ? '本月' : period === 'quarter' ? '本季' : '本年'

  return (
    <div>
      <PageHeader
        title="组织与配额"
        subtitle="管理四级组织架构（集团/分公司/部门/员工）及 Token 与资金双维配额。"
        breadcrumbs={[{ label: '组织治理' }, { label: '组织与配额' }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/quota-approval')}>
              超额申请
            </Button>
            <Button onClick={() => setShowDrawer(true)}>
              <Plus size={16} className="mr-1" />
              新增组织节点
            </Button>
          </>
        }
      />

      {/* 主体两栏布局 */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左侧：企业组织树 */}
        <Card className="w-full lg:w-80 shrink-0">
          <CardHeader>
            <CardTitle>企业组织树</CardTitle>
            <Badge variant="success">多租户</Badge>
          </CardHeader>

          <CardContent>
            <ul className="space-y-1 text-sm">
              {orgTree.map((node) => {
                const Icon = iconMap[node.icon]
                const isSelected = node.id === selectedNodeId
                const indentPx = node.level * 20
                return (
                  <li key={node.id}>
                    <button
                      onClick={() => setSelectedNodeId(node.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left"
                      style={{
                        paddingLeft: `${12 + indentPx}px`,
                        backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                        color: isSelected ? 'var(--brand-main)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {node.level > 0 && (
                        <span
                          className="w-3 h-px shrink-0"
                          style={{ backgroundColor: 'var(--border-color)' }}
                        />
                      )}
                      <Icon
                        size={16}
                        className={node.accent ? 'text-brand-main' : isSelected ? 'text-brand-main' : ''}
                        style={isSelected ? { color: 'var(--brand-main)' } : undefined}
                      />
                      <span className="truncate">{node.label}</span>
                      <span className="text-xs opacity-60 ml-auto shrink-0">{node.sublabel}</span>
                      {isSelected && <ChevronRight size={14} className="shrink-0 opacity-40" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        {/* 右侧：配额详情 */}
        <div className="flex-1 space-y-6">
          {/* 节点标题 + 周期切换 */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  {selectedNode.label}
                  <Badge variant={selectedNode.level <= 1 ? 'success' : selectedNode.level === 2 ? 'info' : 'neutral'}>
                    {selectedNode.sublabel.replace(/[()]/g, '')}
                  </Badge>
                </h2>
                <p className="text-sm text-secondary mt-1">
                  {periodLabel}已用 资金 {formatCurrency(quota.fund.used)} / {formatCurrency(quota.fund.total)}，
                  Token {formatToken(quota.token.used)} / {formatToken(quota.token.total)}
                </p>
              </div>
              <Tabs
                tabs={periodTabs}
                activeTab={period}
                onChange={(id) => setPeriod(id as Period)}
                className="shrink-0"
              />
            </div>
          </Card>

          {/* 资金 + Token 双配额卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuotaCard
              title={`${periodLabel}资金配额 (CNY)`}
              used={formatCurrency(quota.fund.used)}
              total={formatCurrency(quota.fund.total)}
              percent={getPercent(quota.fund.used, quota.fund.total)}
              color="var(--brand-main)"
              icon={<PieChart size={18} />}
            />
            <QuotaCard
              title={`${periodLabel}Token 配额`}
              used={formatToken(quota.token.used)}
              total={formatToken(quota.token.total)}
              percent={getPercent(quota.token.used, quota.token.total)}
              color="var(--brand-accent)"
              icon={<TrendingUp size={18} />}
            />
          </div>

          {/* 守恒分配可视化 */}
          {hasChildren && conservationData && (
            <ConservationBar
              data={conservationData}
              periodLabel={periodLabel}
            />
          )}

          {/* 历史曲线 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} />
                近 12 个月用量趋势
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/logs')}
              >
                查看详情
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <LineChart data={historyData} height={280} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 新增组织节点抽屉 */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="新增组织节点"
        description="创建子级组织节点并分配配额"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              父级节点
            </label>
            <select
              className="input w-full"
              value={parentNode}
              onChange={(e) => setParentNode(e.target.value)}
            >
              <option>集团总部 (Root)</option>
              <option>北京研发中心 (租户)</option>
              <option>上海分公司 (租户)</option>
              <option>AI 架构部 (部门)</option>
              <option>前端开发组 (部门)</option>
              <option>AI 产品部 (部门)</option>
            </select>
          </div>

          <Input
            label="节点名称"
            placeholder="例如：后端开发组"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              节点类型
            </label>
            <select className="input w-full">
              <option>租户 (分公司)</option>
              <option>部门</option>
              <option>员工</option>
            </select>
          </div>

          <Input
            label="资金配额上限 (CNY)"
            type="number"
            placeholder="从父节点未分配池中划拨"
            value={fundQuota}
            onChange={(e) => setFundQuota(e.target.value)}
          />

          <Input
            label="Token 配额上限"
            type="number"
            placeholder="例如：1000000"
            value={tokenQuota}
            onChange={(e) => setTokenQuota(e.target.value)}
          />

          <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            配额将从父节点的未分配池中扣除，确保「父节点总额 = 子节点已分配 + 未分配池」守恒。
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>
              取消
            </Button>
            <Button onClick={() => setShowDrawer(false)}>
              确定新增
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}

// -- 子组件 ---------------------------------------------------------------

function QuotaCard({
  title,
  used,
  total,
  percent,
  color,
  icon,
}: {
  title: string
  used: string
  total: string
  percent: number
  color: string
  icon?: React.ReactNode
}) {
  const isHigh = percent >= 80
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>{title}</p>
          {icon && <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>}
        </div>
        <p className="text-2xl font-bold">{used}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          总额 {total}
        </p>
        <div className="w-full h-2 mt-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: isHigh ? 'var(--color-error, #ef4444)' : color,
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            已使用 {percent}%
          </span>
          {isHigh && (
            <span className="text-xs font-medium" style={{ color: 'var(--color-error, #ef4444)' }}>
              用量偏高
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ConservationBar({
  data,
  periodLabel,
}: {
  data: {
    allocated: { name: string; fund: number; token: number }[]
    totalAllocated: number
    unallocated: number
    total: number
  }
  periodLabel: string
}) {
  const segments = [
    ...data.allocated.map((c) => ({
      name: c.name,
      value: c.fund,
      percent: (c.fund / data.total) * 100,
    })),
    { name: '未分配池', value: data.unallocated, percent: (data.unallocated / data.total) * 100 },
  ]

  const colors = ['var(--brand-main)', 'var(--brand-accent)', '#6366f1', '#ec4899', '#8b5cf6']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart size={18} />
          守恒分配 · {periodLabel}资金配额
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 堆叠横条 */}
        <div className="w-full h-8 rounded-lg overflow-hidden flex" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {segments.map((seg, i) => (
            <div
              key={seg.name}
              className="h-full transition-all flex items-center justify-center overflow-hidden"
              style={{
                width: `${Math.max(seg.percent, 2)}%`,
                backgroundColor: i < data.allocated.length ? colors[i % colors.length] : 'var(--border-color)',
                opacity: i === data.allocated.length ? 0.5 : 1,
              }}
              title={`${seg.name}: ${formatCurrency(seg.value)} (${seg.percent.toFixed(1)}%)`}
            >
              {seg.percent > 10 && (
                <span className="text-xs font-medium text-white truncate px-1">
                  {seg.percent.toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="flex flex-wrap gap-4 mt-3">
          {segments.map((seg, i) => (
            <div key={seg.name} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  backgroundColor: i < data.allocated.length ? colors[i % colors.length] : 'var(--border-color)',
                  opacity: i === data.allocated.length ? 0.5 : 1,
                }}
              />
              <span>{seg.name}</span>
              <span className="font-mono">{formatCurrency(seg.value)}</span>
            </div>
          ))}
        </div>

        {/* 守恒公式 */}
        <div
          className="mt-3 p-3 rounded-lg text-xs font-mono"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          总额 {formatCurrency(data.total)} = 已分配 {formatCurrency(data.totalAllocated)} + 未分配 {formatCurrency(data.unallocated)}
        </div>
      </CardContent>
    </Card>
  )
}
