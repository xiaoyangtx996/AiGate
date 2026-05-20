import { useState } from 'react'
import { Code, Globe, Bell, BarChart3, Plus, Pencil, Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface Plugin {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  installStatus: 'installed' | 'not_installed'
  status: 'enabled' | 'disabled'
  calls7d: number
}

const MOCK_PLUGINS: Plugin[] = [
  {
    id: '1',
    name: '代码执行沙箱',
    description: '安全运行 Python/JS 代码片段，返回执行结果给 Agent。',
    icon: <Code size={22} />,
    category: '代码工具',
    installStatus: 'installed',
    status: 'enabled',
    calls7d: 420,
  },
  {
    id: '2',
    name: '网页爬虫',
    description: '根据 URL 抓取并解析网页内容，供 Agent 参考引用。',
    icon: <Globe size={22} />,
    category: '数据处理',
    installStatus: 'installed',
    status: 'enabled',
    calls7d: 238,
  },
  {
    id: '3',
    name: '钉钉通知',
    description: '将 Agent 执行结果推送到钉钉群消息或个人工作通知。',
    icon: <Bell size={22} />,
    category: '通知推送',
    installStatus: 'not_installed',
    status: 'disabled',
    calls7d: 0,
  },
  {
    id: '4',
    name: 'CSV 数据分析',
    description: '解析上传的 CSV 文件并生成统计报告与图表描述。',
    icon: <BarChart3 size={22} />,
    category: '数据处理',
    installStatus: 'installed',
    status: 'enabled',
    calls7d: 156,
  },
]

const FILTER_TABS = ['全部', '已安装', '数据处理', '通知推送', '代码工具'] as const

export default function Plugins() {
  const [activeTab, setActiveTab] = useState<string>('全部')
  const [modalOpen, setModalOpen] = useState(false)
  const [pluginName, setPluginName] = useState('')

  const filteredPlugins = MOCK_PLUGINS.filter((plugin) => {
    if (activeTab === '全部') return true
    if (activeTab === '已安装') return plugin.installStatus === 'installed'
    return plugin.category === activeTab
  })

  const handleInstall = () => {
    if (!pluginName.trim()) {
      alert('请输入插件名称！')
      return
    }
    alert(
      `[演示] 正在安装插件「${pluginName}」...\n1. 下载插件包 -> 完成\n2. 安全扫描 -> 通过\n3. 依赖检查 -> 正常\n4. 注册到 Agent 调度器 -> 完成\n\n安装成功！`
    )
    setModalOpen(false)
    setPluginName('')
  }

  return (
    <div>
      <PageHeader
        title="插件市场"
        subtitle="扩展 Agent 能力的功能插件，可独立安装启用，无需修改代码。"
        breadcrumbs={[{ label: 'AI 资产市场' }, { label: 'Plugins 插件' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            安装插件
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlugins.map((plugin) => (
          <Card key={plugin.id} hover className="flex flex-col hover:-translate-y-1 transition-transform duration-200">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-12 h-12 rounded-xl border flex items-center justify-center"
                style={{
                  background: 'var(--bg-body)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--brand-main)',
                }}
              >
                {plugin.icon}
              </div>
              <Badge variant={plugin.status === 'enabled' ? 'success' : 'warning'}>
                {plugin.status === 'enabled' ? '启用' : '停用'}
              </Badge>
            </div>
            <h3 className="font-bold text-base mb-1">{plugin.name}</h3>
            <p className="text-secondary text-sm flex-1 mb-4">{plugin.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge border-gray-500 text-xs">{plugin.category}</span>
              <span className="badge border-gray-500 text-xs">
                {plugin.installStatus === 'installed' ? '已安装' : '未安装'}
              </span>
            </div>
            <div
              className="flex justify-between items-center border-t pt-4 mt-auto"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <span className="text-xs text-secondary">
                近7天调用:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{plugin.calls7d}</strong>
              </span>
              <div className="flex gap-3">
                <button
                  className="text-xs font-bold text-secondary hover:text-primary cursor-pointer"
                  onClick={() => alert('编辑接口参数已锁定。如需变更请发布新版本并经过 IT 委员会安全审计。')}
                >
                  <Pencil size={12} className="inline mr-1" />
                  编辑
                </button>
                <button
                  className="text-xs font-bold text-brand-main hover:underline cursor-pointer"
                  onClick={() => {/* navigate to detail */}}
                >
                  <Settings size={12} className="inline mr-1" />
                  配置
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Install Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="安装新插件"
        description="从插件市场选择或上传自定义插件包，安装后可在 Agent 编排中启用。"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="插件名称"
            placeholder="例如：飞书审批通知"
            value={pluginName}
            onChange={(e) => setPluginName(e.target.value)}
          />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              插件来源
            </label>
            <select className="input">
              <option>官方市场</option>
              <option>私有仓库</option>
              <option>本地上传</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              授权可见范围
            </label>
            <select className="input">
              <option>仅当前项目可见</option>
              <option>全租户公开共享</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleInstall}>
            开始安装
          </Button>
        </div>
      </Modal>
    </div>
  )
}
