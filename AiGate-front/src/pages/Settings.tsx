import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bell, MessageSquare, Save } from 'lucide-react'

export default function Settings() {
  const [quotaThreshold, setQuotaThreshold] = useState(90)
  const [keyExpiry, setKeyExpiry] = useState('3')
  const [webhookUrl, setWebhookUrl] = useState(
    'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc...'
  )
  const [channels, setChannels] = useState({
    inApp: true,
    webhook: true,
  })
  const [params, setParams] = useState({
    registerUser: false,
    keyRotate: true,
    commercialMode: true,
  })

  function handleToggleChannel(key: keyof typeof channels) {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleToggleParam(key: keyof typeof params) {
    setParams((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      <PageHeader
        title="参数与预警配置"
        subtitle="全局系统参数、网关安全规则及预警通知触发配置（参考若依参数管理）。"
        breadcrumbs={[{ label: '系统' }, { label: '全局配置' }]}
        actions={
          <Button icon={<Save size={16} />}>保存配置</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 预警规则与通知策略 */}
        <Card className="p-6 space-y-6">
          <h3
            className="text-lg font-semibold border-b pb-2"
            style={{ borderColor: 'var(--border-color)' }}
          >
            预警规则与通知策略
          </h3>

          <CardContent className="space-y-6">
            {/* 额度熔断水位线 */}
            <div>
              <label className="block text-sm font-bold mb-2">
                额度熔断水位线 (%)
              </label>
              <input
                type="range"
                className="w-full accent-brand-main"
                min={50}
                max={100}
                value={quotaThreshold}
                onChange={(e) => setQuotaThreshold(Number(e.target.value))}
              />
              <div className="flex justify-between text-xs text-secondary mt-1">
                <span>50%</span>
                <span>触发告警: {quotaThreshold}%</span>
                <span>100% (自动熔断拦截)</span>
              </div>
            </div>

            {/* 密钥过期预警提前量 */}
            <div className="pt-2">
              <label className="block text-sm font-bold mb-2">
                密钥过期预警提前量
              </label>
              <select
                className="input-base w-full"
                value={keyExpiry}
                onChange={(e) => setKeyExpiry(e.target.value)}
              >
                <option value="3">提前 3 天</option>
                <option value="7">提前 7 天</option>
                <option value="15">提前 15 天</option>
              </select>
            </div>

            {/* 通知接收渠道配置 */}
            <div className="pt-2">
              <label className="block text-sm font-bold mb-2">
                通知接收渠道配置
              </label>
              <div className="flex flex-col gap-3">
                <label
                  className="flex items-center justify-between text-sm p-3 border rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-2">
                    <Bell size={16} /> 系统站内信 (顶栏弹窗)
                  </div>
                  <input
                    type="checkbox"
                    checked={channels.inApp}
                    onChange={() => handleToggleChannel('inApp')}
                    className="rounded border-gray-500"
                  />
                </label>
                <label
                  className="flex items-center justify-between text-sm p-3 border rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} /> 企业微信/钉钉 Webhook
                  </div>
                  <input
                    type="checkbox"
                    checked={channels.webhook}
                    onChange={() => handleToggleChannel('webhook')}
                    className="rounded border-gray-500"
                  />
                </label>
              </div>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-bold mb-2">
                Webhook URL
              </label>
              <input
                type="text"
                className="input-base font-mono text-xs w-full"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 系统参数 */}
        <Card className="p-6 space-y-6">
          <h3
            className="text-lg font-semibold border-b pb-2"
            style={{ borderColor: 'var(--border-color)' }}
          >
            系统参数 (Sys Params)
          </h3>

          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold">
                  允许普通用户自助注册 (sys.account.registerUser)
                </label>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={params.registerUser}
                  onChange={() => handleToggleParam('registerUser')}
                />
              </div>
              <p className="text-xs text-secondary mt-1">
                开启后，内部员工可通过 SSO 自动注册并归属到默认租户组织。
              </p>
            </div>

            <div
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold">
                  强制 API Key 定期轮换 (sys.gateway.keyRotate)
                </label>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={params.keyRotate}
                  onChange={() => handleToggleParam('keyRotate')}
                />
              </div>
              <p className="text-xs text-secondary mt-1">
                要求所有生成的 ag-&#123;env&#125;-&#123;hex&#125; 凭证在 90
                天后自动过期。
              </p>
            </div>

            <div
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold">
                  启用高并发商业模式 (sys.gateway.commercialMode)
                </label>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={params.commercialMode}
                  onChange={() => handleToggleParam('commercialMode')}
                />
              </div>
              <p className="text-xs text-secondary mt-1">
                开启后将关闭部分高开销日志中间件，优化底层吞吐量 (参考
                CLIProxyAPI 设计)。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
