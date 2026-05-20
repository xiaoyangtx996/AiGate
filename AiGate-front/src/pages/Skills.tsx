import { useState, type ReactNode } from 'react'
import { GitBranch, Layers, CheckCircle, MessageSquare, FileText, Plus, Pencil, Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

interface Skill {
  id: string
  name: string
  description: string
  icon: ReactNode
  category: string
  type: '内置' | '自定义'
  status: 'enabled' | 'disabled'
  calls7d: number
}

const MOCK_SKILLS: Skill[] = [
  {
    id: '1',
    name: '代码审查',
    description: '根据企业编码规范对代码进行逐行 Review，输出结构化评审意见。',
    icon: <GitBranch size={22} />,
    category: '代码',
    type: '内置',
    status: 'enabled',
    calls7d: 892,
  },
  {
    id: '2',
    name: '会议纪要整理',
    description: '将原始会议录音文字转化为结构化纪要，含决议事项与 Action Items。',
    icon: <Layers size={22} />,
    category: '文档',
    type: '内置',
    status: 'enabled',
    calls7d: 345,
  },
  {
    id: '3',
    name: '需求拆解',
    description: '将产品需求描述拆解为研发可执行的用户故事和验收标准。',
    icon: <CheckCircle size={22} />,
    category: '产品',
    type: '内置',
    status: 'enabled',
    calls7d: 218,
  },
  {
    id: '4',
    name: 'SQL 生成',
    description: '根据自然语言描述生成 PostgreSQL 查询语句并解释执行计划。',
    icon: <MessageSquare size={22} />,
    category: '数据',
    type: '自定义',
    status: 'enabled',
    calls7d: 560,
  },
  {
    id: '5',
    name: '周报生成',
    description: '根据本周工作日志与任务列表自动生成周报初稿。',
    icon: <FileText size={22} />,
    category: '文档',
    type: '自定义',
    status: 'disabled',
    calls7d: 0,
  },
]

export default function Skills() {
  const [modalOpen, setModalOpen] = useState(false)
  const [skillName, setSkillName] = useState('')

  const handleCreate = () => {
    if (!skillName.trim()) {
      alert('请输入技能名称！')
      return
    }
    alert(
      `[演示] 技能 「${skillName}」 创建成功！\n\n该技能已进入草稿状态，请配置提示词模板和变量插槽后启用。`
    )
    setModalOpen(false)
    setSkillName('')
  }

  return (
    <div>
      <PageHeader
        title="Skills 技能库"
        subtitle="可复用的提示词模板与任务技能，可直接绑定到 Agent 使用。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'Skills 技能库' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            创建技能
          </Button>
        }
      />

      {/* Skill Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_SKILLS.map((skill) => (
          <Card key={skill.id} hover className="flex flex-col hover:-translate-y-1 transition-transform duration-200">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-12 h-12 rounded-xl border flex items-center justify-center"
                style={{
                  background: 'var(--bg-body)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--brand-main)',
                }}
              >
                {skill.icon}
              </div>
              <Badge variant={skill.status === 'enabled' ? 'success' : 'warning'}>
                {skill.status === 'enabled' ? '启用' : '停用'}
              </Badge>
            </div>
            <h3 className="font-bold text-base mb-1">{skill.name}</h3>
            <p className="text-secondary text-sm flex-1 mb-4">{skill.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge border-gray-500 text-xs">{skill.type}</span>
              <span className="badge border-gray-500 text-xs">{skill.category}</span>
            </div>
            <div
              className="flex justify-between items-center border-t pt-4 mt-auto"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <span className="text-xs text-secondary">
                近7天调用:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{skill.calls7d}</strong>
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

      {/* Create Skill Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="创建新技能"
        description="定义一个可复用的提示词模板技能，可绑定到 Agent 或在对话中直接调用。"
      >
        <div className="space-y-4">
          <Input
            label="技能名称"
            placeholder="例如：SQL 生成"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
          />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              技能分类
            </label>
            <select className="input">
              <option>代码</option>
              <option>文档</option>
              <option>产品</option>
              <option>数据</option>
              <option>其他</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              技能描述
            </label>
            <textarea
              className="input h-20"
              placeholder="描述该技能的用途和触发场景..."
            />
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              提示词模板
            </label>
            <textarea
              className="input font-mono text-xs h-32"
              placeholder={'你是一个代码审查专家。请根据以下编码规范对代码进行逐行 Review...\n\n{{code}}'}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            创建技能
          </Button>
        </div>
      </Modal>
    </div>
  )
}
