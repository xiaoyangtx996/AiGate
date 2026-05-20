import { useState } from 'react'
import { Plus, Pencil, Shield, FileText, Wand2, Type } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface Hook {
  id: string
  name: string
  trigger: 'pre-request' | 'post-response'
  description: string
  scope: string
  status: 'enabled' | 'disabled'
}

const MOCK_HOOKS: Hook[] = [
  {
    id: '1',
    name: '敏感词过滤',
    trigger: 'pre-request',
    description: '检测 prompt 中的敏感关键词，命中则拒绝请求',
    scope: '全局',
    status: 'enabled',
  },
  {
    id: '2',
    name: '请求日志增强',
    trigger: 'post-response',
    description: '将每次调用的完整 prompt+response 写入审计库',
    scope: '全局',
    status: 'enabled',
  },
  {
    id: '3',
    name: '系统提示词注入',
    trigger: 'pre-request',
    description: '自动在 system message 中注入企业安全合规声明',
    scope: '研发中心',
    status: 'disabled',
  },
  {
    id: '4',
    name: '响应格式化',
    trigger: 'post-response',
    description: '将 Markdown 格式输出转为纯文本返回给特定 Key',
    scope: 'ag-prod-c3d4',
    status: 'enabled',
  },
]

function getHookIcon(id: string) {
  switch (id) {
    case '1': return <Shield size={18} />
    case '2': return <FileText size={18} />
    case '3': return <Wand2 size={18} />
    case '4': return <Type size={18} />
    default: return <Shield size={18} />
  }
}

export default function Hooks() {
  const [modalOpen, setModalOpen] = useState(false)
  const [hookName, setHookName] = useState('')
  const [triggerType, setTriggerType] = useState<'pre-request' | 'post-response'>('pre-request')

  const handleCreate = () => {
    if (!hookName.trim()) {
      alert('请输入 Hook 名称！')
      return
    }
    alert(
      `[演示] 创建 Hook 「${hookName}」\n触发时机：${triggerType}\n\nHook 创建成功！可在调用流程中生效。`
    )
    setModalOpen(false)
    setHookName('')
  }

  return (
    <div>
      <PageHeader
        title="Hooks 事件钩子"
        subtitle="在 AI 调用流程中插入自定义处理逻辑，如日志记录、敏感词过滤、请求改写。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'Hooks 钩子' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            新建 Hook
          </Button>
        }
      />

      {/* Hook Table */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead
            className="border-b text-xs uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            <tr>
              <th className="p-4">Hook 名称</th>
              <th className="p-4">触发时机</th>
              <th className="p-4">处理逻辑</th>
              <th className="p-4">作用范围</th>
              <th className="p-4">状态</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm" style={{ borderColor: 'var(--border-color)' }}>
            {MOCK_HOOKS.map((hook) => (
              <tr
                key={hook.id}
                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--brand-main)',
                      }}
                    >
                      {getHookIcon(hook.id)}
                    </div>
                    <span className="font-bold">{hook.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant="neutral">{hook.trigger}</Badge>
                </td>
                <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                  {hook.description}
                </td>
                <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                  {hook.scope}
                </td>
                <td className="p-4">
                  <Badge variant={hook.status === 'enabled' ? 'success' : 'warning'}>
                    {hook.status === 'enabled' ? '启用' : '停用'}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    className="text-xs font-bold hover:underline cursor-pointer"
                    style={{ color: 'var(--brand-main)' }}
                    onClick={() => alert(`[演示] 编辑 Hook「${hook.name}」的配置参数。`)}
                  >
                    <Pencil size={12} className="inline mr-1" />
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="新建 Hook"
        description="创建一个事件钩子，在 AI 调用流程中插入自定义处理逻辑。"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Hook 名称"
            placeholder="例如：敏感词过滤、请求日志增强"
            value={hookName}
            onChange={(e) => setHookName(e.target.value)}
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              触发时机
            </label>
            <select
              className="input"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as 'pre-request' | 'post-response')}
            >
              <option value="pre-request">pre-request (请求前拦截)</option>
              <option value="post-response">post-response (响应后处理)</option>
            </select>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              处理逻辑描述
            </label>
            <textarea
              className="input h-20"
              placeholder="描述该 Hook 的处理逻辑..."
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              作用范围
            </label>
            <select className="input">
              <option>全局</option>
              <option>指定租户</option>
              <option>指定项目</option>
              <option>指定密钥</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            创建 Hook
          </Button>
        </div>
      </Modal>
    </div>
  )
}
