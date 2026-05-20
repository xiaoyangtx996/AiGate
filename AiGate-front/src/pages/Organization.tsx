import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import {
  Home,
  Building2,
  FolderOpen,
  Users,
} from 'lucide-react'

// -- 组织树节点数据 -------------------------------------------------------
interface OrgNode {
  id: string
  label: string
  sublabel: string
  icon: 'home' | 'building' | 'folder' | 'user'
  level: number
  accent?: boolean
  detail?: string
}

const orgTree: OrgNode[] = [
  { id: 'root', label: '集团总部', sublabel: '(Root)', icon: 'home', level: 0, accent: true },
  { id: 'bj', label: '北京研发中心', sublabel: '(租户)', icon: 'building', level: 1 },
  { id: 'ai', label: 'AI 架构部', sublabel: '(部门)', icon: 'folder', level: 2 },
  { id: 'zhang', label: '张三', sublabel: '(员工/3密钥)', icon: 'user', level: 3, detail: '3' },
  { id: 'li', label: '李四', sublabel: '(员工/1密钥)', icon: 'user', level: 3 },
]

const iconMap = {
  home: Home,
  building: Building2,
  folder: FolderOpen,
  user: Users,
} as const

// -- 配额数据 -------------------------------------------------------------
const quotaData = {
  tenant: '北京研发中心',
  tenantCode: 'TENANT_BJ_01',
  fund: { used: '15,000', total: '50,000', percent: 30 },
  token: { used: '4.2M', total: '10M', percent: 42 },
}

// -- 组件 -----------------------------------------------------------------
export default function Organization() {
  const [showModal, setShowModal] = useState(false)
  const [parentNode, setParentNode] = useState('北京研发中心 (租户)')
  const [nodeName, setNodeName] = useState('')
  const [fundQuota, setFundQuota] = useState('')

  return (
    <div>
      <PageHeader
        title="组织与配额"
        subtitle="管理四级组织架构（集团/分公司/部门/员工）及 Token 与资金双维配额。"
        breadcrumbs={[{ label: '组织治理' }, { label: '组织与配额' }]}
        actions={
          <>
            <Button variant="secondary">首次入驻向导</Button>
            <Button onClick={() => setShowModal(true)}>新增组织节点</Button>
          </>
        }
      />

      {/* 主体两栏布局 */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* 左侧：企业组织树 */}
        <Card className="w-full md:w-1/3 h-96 overflow-y-auto">
          <CardHeader>
            <CardTitle>企业组织树</CardTitle>
            <Badge variant="success">多租户</Badge>
          </CardHeader>

          <ul className="space-y-2 text-sm text-secondary">
            {orgTree.map((node) => {
              const Icon = iconMap[node.icon]
              const indentClass = [
                '',
                'pl-6 border-l ml-2',
                'pl-12 border-l ml-2',
                'pl-16 ml-2',
              ][node.level] ?? ''
              return (
                <li
                  key={node.id}
                  className={`flex items-center gap-2 ${indentClass}`}
                  style={node.level > 0 && node.level < 3 ? { borderColor: 'var(--border-color)' } : undefined}
                >
                  <Icon
                    size={16}
                    className={node.accent ? 'text-brand-main' : ''}
                  />
                  <span className={node.accent ? 'text-brand-main font-bold' : ''}>
                    {node.label}{' '}
                    <span className="text-secondary font-normal">{node.sublabel}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* 右侧：租户详情与配额 */}
        <Card className="flex-1 flex flex-col items-center justify-center border-dashed bg-transparent shadow-none">
          <div className="flex justify-between items-start w-full mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                {quotaData.tenant}
                <Badge variant="success">租户级</Badge>
              </h2>
              <p className="text-sm text-secondary mt-2 font-mono">
                {quotaData.tenantCode}
              </p>
            </div>
            <Button variant="secondary">超额申请</Button>
          </div>

          <div className="flex gap-8 w-full">
            {/* 资金配额卡片 */}
            <QuotaCard
              title="本月资金配额 (CNY)"
              value={`¥ ${quotaData.fund.used} / ¥ ${quotaData.fund.total}`}
              percent={quotaData.fund.percent}
              color="var(--brand-main)"
            />
            {/* Token 配额卡片 */}
            <QuotaCard
              title="总量 Token 配额"
              value={`${quotaData.token.used} / ${quotaData.token.total}`}
              percent={quotaData.token.percent}
              color="var(--brand-accent)"
            />
          </div>
        </Card>
      </div>

      {/* 新增组织节点弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="新增组织节点"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary uppercase mb-2">
              父级节点
            </label>
            <select
              className="input-base w-full"
              value={parentNode}
              onChange={(e) => setParentNode(e.target.value)}
            >
              <option>北京研发中心 (租户)</option>
              <option>AI 架构部 (部门)</option>
            </select>
          </div>

          <Input
            label="节点名称"
            placeholder="例如：前端开发组"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
          />

          <Input
            label="资金配额上限 (CNY)"
            type="number"
            placeholder="可选填"
            value={fundQuota}
            onChange={(e) => setFundQuota(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button onClick={() => setShowModal(false)}>确定新增</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// -- 子组件 ---------------------------------------------------------------

function QuotaCard({
  title,
  value,
  percent,
  color,
}: {
  title: string
  value: string
  percent: number
  color: string
}) {
  return (
    <Card className="flex-1 border-solid bg-surface">
      <p className="text-xs font-bold text-secondary uppercase mb-2">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <div className="w-full h-1 mt-2 rounded overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-1"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </Card>
  )
}
