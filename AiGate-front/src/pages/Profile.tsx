import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Save, Copy, AlertTriangle, User, Key, Lock } from 'lucide-react'

export default function Profile() {
  const [name, setName] = useState('张三')
  const [email, setEmail] = useState('zhangsan@company.com')
  const [phone, setPhone] = useState('138****5678')
  const [wechatId, setWechatId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const usedQuota = 248.5
  const totalQuota = 500.0
  const usagePercent = ((usedQuota / totalQuota) * 100).toFixed(1)

  return (
    <div>
      <PageHeader
        title="个人中心"
        subtitle="查看个人账号信息、配额余量与通知绑定。"
        breadcrumbs={[{ label: '系统' }, { label: '个人中心' }]}
        actions={<Button icon={<Save size={16} />}>保存修改</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Avatar & Quota Card */}
        <Card className="col-span-1 flex flex-col items-center text-center py-10">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-4"
            style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
          >
            张
          </div>
          <div className="text-xl font-bold">张三</div>
          <div className="text-secondary text-sm mt-1">zhangsan@company.com</div>
          <div className="mt-3">
            <Badge variant="success">普通成员</Badge>
          </div>
          <div className="mt-4 text-xs text-secondary">归属: 北京研发中心 / 架构组</div>

          <div
            className="mt-6 w-full border-t pt-6 space-y-3 text-left"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="flex justify-between text-sm">
              <span className="text-secondary">本月已用额度</span>
              <span className="font-bold">¥ {usedQuota.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">个人配额上限</span>
              <span className="font-bold">¥ {totalQuota.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full mt-1" style={{ background: 'var(--border-color)' }}>
              <div
                className="h-2 rounded-full bg-brand-main"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="text-xs text-secondary text-right">已用 {usagePercent}%</div>
          </div>
        </Card>

        {/* Right: Form Cards */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="p-6 space-y-4">
            <h3
              className="font-bold border-b pb-3 flex items-center gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <User size={18} className="text-brand-main" />
              基本信息
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                  姓名
                </label>
                <input
                  className="input-base w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                  邮箱
                </label>
                <input
                  className="input-base w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                  手机号
                </label>
                <input
                  className="input-base w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                  企业微信 ID
                </label>
                <input
                  className="input-base w-full"
                  value={wechatId}
                  onChange={(e) => setWechatId(e.target.value)}
                  placeholder="绑定后接收预警推送"
                />
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-6 space-y-4">
            <h3
              className="font-bold border-b pb-3 flex items-center gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Lock size={18} className="text-brand-main" />
              修改密码
            </h3>
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                当前密码
              </label>
              <input
                type="password"
                className="input-base w-full"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                  新密码
                </label>
                <input
                  type="password"
                  className="input-base w-full"
                  placeholder="至少 8 位"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">
                  确认新密码
                </label>
                <input
                  type="password"
                  className="input-base w-full"
                  placeholder="再次输入"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <Button variant="secondary" size="sm">
              更新密码
            </Button>
          </Card>

          {/* API Keys */}
          <Card className="p-6 space-y-4">
            <h3
              className="font-bold border-b pb-3 flex items-center gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Key size={18} className="text-brand-main" />
              我的 API Key
            </h3>
            <div className="space-y-3">
              <div
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div>
                  <div className="font-mono text-sm font-bold text-brand-main">
                    ag-dev-3a1b****ef90
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    DEV · 到期: 2026-07-28 · 支持: gpt-4o, claude-3-5
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={<Copy size={12} />}>
                    复制
                  </Button>
                  <button className="text-brand-accent text-xs font-bold hover:underline inline-flex items-center gap-1">
                    <AlertTriangle size={12} />
                    吊销
                  </button>
                </div>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full">
              管理我的所有密钥
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
