import { useState } from 'react'
import { Key, Plus, Copy } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'

interface KeyItem {
  id: string
  name: string
  keyPreview: string
  keyFull: string
  env: 'PROD' | 'DEV'
  expiry: string
  expiryWarning?: string
  status: 'normal' | 'revoked'
  calls: string
  cost: string
  models: { name: string; authorized: boolean }[]
  recentLogs: {
    model: string
    status: string
    statusType: 'success' | 'error'
    time: string
    tokens?: string
    latency?: string
    errorMsg?: string
  }[]
}

const MOCK_KEYS: KeyItem[] = [
  {
    id: '1',
    name: 'Cursor 专用',
    keyPreview: 'ag-prod-8f2c...e1b9',
    keyFull: 'ag-prod-8f2c-8f2c-e1b9',
    env: 'PROD',
    expiry: '2026-12-31',
    status: 'normal',
    calls: '14,205 次',
    cost: '¥ 342.80',
    models: [
      { name: 'gpt-4o', authorized: true },
      { name: 'claude-3-5-sonnet', authorized: true },
      { name: 'gemini-1.5-pro', authorized: true },
      { name: 'dall-e-3', authorized: false },
    ],
    recentLogs: [
      { model: 'gpt-4o', status: '调用成功 (200 OK)', statusType: 'success', time: '1 分钟前', tokens: '1,420 Tokens', latency: '45ms' },
      { model: 'claude-3-5-sonnet', status: '调用成功 (200 OK)', statusType: 'success', time: '12 分钟前', tokens: '840 Tokens', latency: '38ms' },
      { model: 'gemini-1.5-pro', status: '被限流拦截 (429 Rate)', statusType: 'error', time: '1 小时前', errorMsg: '触发了部门单日频次限制阈值' },
    ],
  },
  {
    id: '2',
    name: '测试自动化 Key',
    keyPreview: 'ag-dev-3a1b...9c8d',
    keyFull: 'ag-dev-3a1b-3a1b-9c8d',
    env: 'DEV',
    expiry: '2026-05-23',
    expiryWarning: '即将过期 (3天)',
    status: 'normal',
    calls: '4,812 次',
    cost: '¥ 24.15',
    models: [
      { name: 'gpt-4o', authorized: true },
      { name: 'claude-3-5-sonnet', authorized: true },
    ],
    recentLogs: [
      { model: 'gpt-4o', status: '调用成功 (200 OK)', statusType: 'success', time: '30 分钟前', tokens: '520 Tokens', latency: '62ms' },
    ],
  },
]

export default function Keys() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<KeyItem | null>(null)

  const handleOpenDrawer = (key: KeyItem) => {
    setSelectedKey(key)
    setDrawerOpen(true)
  }

  const handleCopyKey = () => {
    if (selectedKey) {
      navigator.clipboard.writeText(selectedKey.keyFull)
    }
  }

  return (
    <div>
      <PageHeader
        title="密钥与凭证"
        subtitle="管理 API Key 访问凭证（格式: ag-{env}-{hex}），员工持有上限 3 个。"
        breadcrumbs={[{ label: '网关接入' }, { label: '密钥管理' }]}
        actions={
          <>
            <Badge variant="neutral">当前拥有: 2 / 3</Badge>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              生成新密钥
            </Button>
          </>
        }
      />

      {/* Key List Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead
            className="border-b"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
          >
            <tr>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">密钥别名 / Key</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">环境</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">到期时间</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">状态</th>
              <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {MOCK_KEYS.map((key) => (
              <tr
                key={key.id}
                className="border-b transition-colors hover:bg-elevated cursor-pointer"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={() => handleOpenDrawer(key)}
              >
                <td className="p-4 font-mono text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Key size={14} className="text-secondary" />
                    <span className="font-sans font-bold">{key.name}</span>
                  </div>
                  <span className={key.env === 'PROD' ? 'text-brand-main' : 'text-secondary'}>
                    {key.keyPreview}
                  </span>
                </td>
                <td className="p-4">
                  <Badge variant={key.env === 'PROD' ? 'success' : 'warning'}>{key.env}</Badge>
                </td>
                <td className="p-4">
                  {key.expiryWarning ? (
                    <span className="text-brand-accent font-bold">{key.expiryWarning}</span>
                  ) : (
                    <span className="text-secondary">{key.expiry}</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <Badge variant={key.status === 'normal' ? 'success' : 'error'}>
                    {key.status === 'normal' ? '正常' : '已吊销'}
                  </Badge>
                </td>
                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button variant="secondary" size="sm" className="text-brand-accent">
                    吊销
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {MOCK_KEYS.length === 0 && (
          <div className="empty-state py-12">
            <Key size={48} />
            <h3 className="text-lg font-medium mt-4">暂无密钥</h3>
            <p className="text-sm mt-2">您还没有创建任何 API Key</p>
            <Button variant="primary" icon={<Plus size={16} />} className="mt-4" onClick={() => setModalOpen(true)}>
              生成第一个密钥
            </Button>
          </div>
        )}
      </Card>

      {/* Create Key Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="生成新 API Key"
        size="md"
      >
        <div className="space-y-4">
          <Input label="用途名称" placeholder="例如：自动化测试脚本使用" />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              作用环境 (Environment)
            </label>
            <select className="input">
              <option>开发环境 (DEV)</option>
              <option>生产环境 (PROD)</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              有效时长
            </label>
            <select className="input">
              <option>30 天</option>
              <option>90 天 (推荐)</option>
              <option>永久有效 (需审批)</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(false)}>
            立即生成
          </Button>
        </div>
      </Modal>

      {/* Key Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedKey?.name ?? '密钥详情'}
        width="sm"
      >
        {selectedKey && (
          <div className="space-y-6">
            {/* Env Badge */}
            <Badge variant={selectedKey.env === 'PROD' ? 'success' : 'warning'}>
              {selectedKey.env}
            </Badge>

            {/* Secret Key */}
            <div>
              <label className="block text-xs font-bold text-secondary uppercase mb-2">
                密钥密匙 (Secret Key)
              </label>
              <div
                className="flex items-center gap-2 p-3 rounded-lg border font-mono text-xs text-brand-main"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <span className="flex-1">{selectedKey.keyFull}</span>
                <button
                  onClick={handleCopyKey}
                  className="text-secondary hover:text-brand-main transition-colors cursor-pointer"
                  title="复制密钥"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-3 rounded-lg border"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <div className="text-secondary text-xs">累计调用次数</div>
                <div className="text-lg font-bold mt-1">{selectedKey.calls}</div>
              </div>
              <div
                className="p-3 rounded-lg border"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
              >
                <div className="text-secondary text-xs">本月消耗费用</div>
                <div className="text-lg font-bold mt-1">{selectedKey.cost}</div>
              </div>
            </div>

            {/* Authorized Models */}
            <div>
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">
                授权模型权限
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedKey.models.map((model) =>
                  model.authorized ? (
                    <Badge key={model.name} variant="success">{model.name}</Badge>
                  ) : (
                    <Badge key={model.name} variant="neutral" className="border border-[var(--border-color)]">
                      {model.name} (未授权)
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Recent Request Timeline */}
            <div>
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">
                最近请求流水
              </h3>
              <div className="space-y-4 text-xs">
                {selectedKey.recentLogs.map((log, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        background: log.statusType === 'success' ? 'var(--brand-main)' : 'var(--brand-accent)',
                      }}
                    />
                    <div>
                      <div className="font-bold">
                        {log.model} {log.status}
                      </div>
                      <div
                        className="mt-0.5"
                        style={{
                          color: log.statusType === 'success' ? 'var(--text-secondary)' : 'var(--brand-accent)',
                          fontWeight: log.statusType === 'error' ? 700 : 400,
                        }}
                      >
                        {log.time}
                        {log.tokens && ` · 消耗 ${log.tokens}`}
                        {log.latency && ` · 延迟 ${log.latency}`}
                        {log.errorMsg && ` · ${log.errorMsg}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <Button variant="secondary" className="w-full" onClick={() => setDrawerOpen(false)}>
              关闭详情
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  )
}
