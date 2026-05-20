import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Building2,
  Gauge,
  Key,
  Cpu,
  AlertTriangle,
  Bell,
  Shield,
  Lock,
  Database,
  Brain,
  Store,
  Save,
  Info,
  ChevronRight,
  Plus,
  Check,
} from 'lucide-react'

/* ---------- 类型定义 ---------- */

interface TabItem {
  id: string
  label: string
  icon: React.ReactNode
  description: string
}

/* ---------- Tab 定义 ---------- */

const tabs: TabItem[] = [
  { id: 'basic', label: '基础信息', icon: <Building2 size={18} />, description: '租户名 / Logo / 联系人 / 时区 / 语言' },
  { id: 'quota', label: '配额规则', icon: <Gauge size={18} />, description: '配额周期 / 超额审批 / 耗尽策略' },
  { id: 'key-default', label: '密钥默认', icon: <Key size={18} />, description: '有效期 / IP 白名单 / 活跃上限' },
  { id: 'model-whitelist', label: '模型白名单', icon: <Cpu size={18} />, description: '允许调用的模型清单与成本系数' },
  { id: 'alert-rules', label: '预警规则', icon: <AlertTriangle size={18} />, description: '12 类预警阈值与自动处置' },
  { id: 'notify-channels', label: '通知渠道', icon: <Bell size={18} />, description: '邮件 / 短信 / 企微 / 钉钉 / Webhook' },
  { id: 'sso', label: 'SSO 集成', icon: <Shield size={18} />, description: '企微 / 钉钉 / LDAP / OIDC 配置' },
  { id: 'security', label: '安全策略', icon: <Lock size={18} />, description: '密码强度 / 2FA / IP 白名单 / 会话时长' },
  { id: 'audit-retention', label: '审计保留', icon: <Database size={18} />, description: '调用日志 180 天 / 操作日志 365 天' },
  { id: 'rag-default', label: 'RAG 默认策略', icon: <Brain size={18} />, description: '分块大小 / 嵌入模型 / Rerank / Top-K' },
  { id: 'marketplace', label: '资产市场默认', icon: <Store size={18} />, description: '可见性 / 审核策略 / 公共市场' },
]

/* ---------- 辅助组件 ---------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-sm font-semibold pb-2 mb-4 border-b"
      style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
    >
      {children}
    </h4>
  )
}

function FieldRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
          {description && (
            <span className="relative group inline-flex">
              <Info size={13} className="text-secondary cursor-help" />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block w-56 p-2 text-xs rounded-lg shadow-lg"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                {description}
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? 'var(--brand-main)' : 'var(--border-color)' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(4px)' }}
      />
    </button>
  )
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      className="input text-sm px-3 py-1.5 rounded-lg min-w-[140px]"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function LastModified({ user, time }: { user: string; time: string }) {
  return (
    <p className="text-xs text-secondary mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
      上次修改：<span className="text-brand-main cursor-pointer hover:underline">{user}</span> · {time}
    </p>
  )
}

/* ---------- 各 Tab 面板 ---------- */

function BasicInfoTab() {
  const [name, setName] = useState('北京星辰科技集团')
  const [contact, setContact] = useState('张三')
  const [email, setEmail] = useState('admin@startech.com')
  const [timezone, setTimezone] = useState('Asia/Shanghai')
  const [language, setLanguage] = useState('zh-CN')
  const [theme, setTheme] = useState('dark')
  const [subdomain, setSubdomain] = useState('startech')
  const [logoUrl, setLogoUrl] = useState('https://cdn.startech.com/logo.svg')

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>基础信息</CardTitle>
        <Badge variant="info">sys_admin, tenant_admin</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <FieldRow label="租户名称" description="显示在平台左上角和导出报表中的企业名称">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="w-72 text-sm" />
        </FieldRow>
        <FieldRow label="企业 Logo URL" description="建议尺寸 200x48，支持 SVG/PNG">
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-72 text-sm" placeholder="https://..." />
        </FieldRow>
        <FieldRow label="管理员联系人" description="紧急事件通知的负责人">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} className="w-48 text-sm" />
        </FieldRow>
        <FieldRow label="管理员邮箱" description="预警通知和安全告警的接收邮箱">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="w-72 text-sm" type="email" />
        </FieldRow>
        <FieldRow label="时区" description="影响报表统计和定时任务的基准时区">
          <SelectField value={timezone} onChange={setTimezone} options={[
            { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
            { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
            { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
          ]} />
        </FieldRow>
        <FieldRow label="默认语言" description="新用户注册时的默认界面语言">
          <SelectField value={language} onChange={setLanguage} options={[
            { value: 'zh-CN', label: '简体中文' },
            { value: 'en-US', label: 'English' },
          ]} />
        </FieldRow>
        <FieldRow label="默认主题" description="新用户注册时的默认视觉风格">
          <SelectField value={theme} onChange={setTheme} options={[
            { value: 'dark', label: '暗黑科技' },
            { value: 'light', label: '杂志白亮' },
            { value: 'apple', label: 'Apple 拟物' },
          ]} />
        </FieldRow>
        <FieldRow label="企业子域名" description="用于访问平台的自定义子域名">
          <div className="flex items-center gap-1">
            <Input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} className="w-36 text-sm" />
            <span className="text-xs text-secondary">.aigate.com</span>
          </div>
        </FieldRow>
      </CardContent>
      <LastModified user="张三" time="2026-05-18 14:32" />
    </Card>
  )
}

function QuotaRulesTab() {
  const [cycle, setCycle] = useState('monthly')
  const [approvalLevel, setApprovalLevel] = useState('dept_lead')
  const [depletion, setDepletion] = useState('block')
  const [autoRecover, setAutoRecover] = useState(true)

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>配额规则</CardTitle>
        <Badge variant="info">sys_admin, tenant_admin</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <FieldRow label="默认配额周期" description="新组织/员工配额的重置周期">
          <SelectField value={cycle} onChange={setCycle} options={[
            { value: 'monthly', label: '每月重置' },
            { value: 'quarterly', label: '每季度重置' },
            { value: 'yearly', label: '每年重置' },
          ]} />
        </FieldRow>
        <FieldRow label="超额申请审批层级" description="员工超额后需要哪一级别审批">
          <SelectField value={approvalLevel} onChange={setApprovalLevel} options={[
            { value: 'dept_lead', label: '部门负责人' },
            { value: 'tenant_admin', label: '分公司管理员' },
            { value: 'sys_admin', label: '集团 IT 管理员' },
          ]} />
        </FieldRow>
        <FieldRow label="配额耗尽后处置策略" description="当组织或员工配额用尽后的行为">
          <SelectField value={depletion} onChange={setDepletion} options={[
            { value: 'block', label: '直接拦截' },
            { value: 'degrade', label: '降级到免费模型' },
            { value: 'queue', label: '排队等待下周期' },
          ]} />
        </FieldRow>
        <FieldRow label="周期开始自动恢复配额" description="每个新周期开始时自动将配额重置为分配值">
          <Toggle checked={autoRecover} onChange={() => setAutoRecover(!autoRecover)} />
        </FieldRow>
      </CardContent>
      <LastModified user="李四" time="2026-05-15 09:20" />
    </Card>
  )
}

function KeyDefaultTab() {
  const [expiry, setExpiry] = useState('90')
  const [ipWhitelist, setIpWhitelist] = useState(false)
  const [maxKeys, setMaxKeys] = useState('3')
  const [dailyLimit, setDailyLimit] = useState('10000')
  const [formatPreview] = useState('ag-{env}-{hex32}')

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>密钥默认参数</CardTitle>
        <Badge variant="info">sys_admin</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <FieldRow label="默认有效期" description="新生成密钥的默认过期时间">
          <SelectField value={expiry} onChange={setExpiry} options={[
            { value: '30', label: '30 天' },
            { value: '60', label: '60 天' },
            { value: '90', label: '90 天' },
            { value: '180', label: '180 天' },
            { value: '365', label: '365 天' },
          ]} />
        </FieldRow>
        <FieldRow label="默认启用 IP 白名单" description="新密钥是否默认启用 IP 白名单限制">
          <Toggle checked={ipWhitelist} onChange={() => setIpWhitelist(!ipWhitelist)} />
        </FieldRow>
        <FieldRow label="单人活跃密钥上限" description="每个用户同时持有的未过期密钥数">
          <Input value={maxKeys} onChange={(e) => setMaxKeys(e.target.value)} type="number" className="w-24 text-sm text-center" />
        </FieldRow>
        <FieldRow label="每日调用上限（默认值）" description="单个密钥每日可调用的请求次数上限">
          <Input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} type="number" className="w-32 text-sm text-center" />
        </FieldRow>
        <FieldRow label="密钥格式预览" description="系统生成密钥的格式规范">
          <code className="text-xs font-mono px-3 py-1.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--brand-main)' }}>
            {formatPreview}
          </code>
        </FieldRow>
      </CardContent>
      <LastModified user="张三" time="2026-05-12 16:45" />
    </Card>
  )
}

function ModelWhitelistTab() {
  const models = [
    { name: 'GPT-4o', provider: 'OpenAI', cost: '1.0', enabled: true, roles: '全部' },
    { name: 'GPT-4o-mini', provider: 'OpenAI', cost: '0.1', enabled: true, roles: '全部' },
    { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', cost: '0.8', enabled: true, roles: '全部' },
    { name: 'Claude 3 Haiku', provider: 'Anthropic', cost: '0.05', enabled: true, roles: '全部' },
    { name: 'DeepSeek-V3', provider: 'DeepSeek', cost: '0.2', enabled: true, roles: '全部' },
    { name: 'Qwen-Max', provider: '阿里云', cost: '0.4', enabled: false, roles: '部门负责人+' },
    { name: 'GLM-4', provider: '智谱', cost: '0.3', enabled: false, roles: '部门负责人+' },
  ]

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>模型白名单</CardTitle>
        <Button variant="secondary" size="sm" icon={<Plus size={14} />}>添加模型</Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-secondary mb-4">
          配置允许调用的模型清单及成本系数。模型白名单调整对已存在的密钥不立即生效。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="text-left py-2 font-medium text-secondary">模型名称</th>
                <th className="text-left py-2 font-medium text-secondary">供应商</th>
                <th className="text-center py-2 font-medium text-secondary">成本系数</th>
                <th className="text-left py-2 font-medium text-secondary">可用角色</th>
                <th className="text-center py-2 font-medium text-secondary">启用</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</td>
                  <td className="py-2.5 text-secondary">{m.provider}</td>
                  <td className="py-2.5 text-center">
                    <code className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>{m.cost}x</code>
                  </td>
                  <td className="py-2.5 text-secondary">{m.roles}</td>
                  <td className="py-2.5 text-center">
                    <Toggle checked={m.enabled} onChange={() => {}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      <LastModified user="张三" time="2026-05-10 11:30" />
    </Card>
  )
}

function AlertRulesTab() {
  const rules = [
    { name: '配额用量达到 70%', level: 'warning', channel: '站内信', action: '无', enabled: true },
    { name: '配额用量达到 90%', level: 'warning', channel: '站内信 + Webhook', action: '触发告警', enabled: true },
    { name: '配额耗尽 (100%)', level: 'error', channel: '全部渠道', action: '自动拦截', enabled: true },
    { name: '密钥即将过期 (3天)', level: 'warning', channel: '站内信', action: '无', enabled: true },
    { name: '密钥已过期', level: 'error', channel: '站内信 + Webhook', action: '自动吊销', enabled: true },
    { name: '异常调用频率 (>10x)', level: 'error', channel: '全部渠道', action: '临时封禁', enabled: true },
    { name: 'MCP 工具健康降级', level: 'warning', channel: '站内信', action: '无', enabled: true },
    { name: 'MCP 工具不可用', level: 'error', channel: '站内信 + Webhook', action: '自动降级', enabled: true },
    { name: 'Agent 调用异常 5x', level: 'warning', channel: '站内信', action: '核实/临时停用', enabled: true },
    { name: '知识库索引失败', level: 'error', channel: '站内信', action: '无', enabled: true },
    { name: 'SSO 同步异常', level: 'error', channel: '站内信 + Webhook', action: '无', enabled: false },
    { name: '存储空间不足 (<10%)', level: 'warning', channel: '站内信 + Webhook', action: '无', enabled: true },
  ]

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>预警规则</CardTitle>
        <Badge variant="info">sys_admin, tenant_admin</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-secondary mb-4">
          12 类预警规则的阈值 / 通知对象 / 通知渠道 / 自动处置策略，每条可独立启停。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="text-left py-2 font-medium text-secondary">预警名称</th>
                <th className="text-center py-2 font-medium text-secondary">级别</th>
                <th className="text-left py-2 font-medium text-secondary">通知渠道</th>
                <th className="text-left py-2 font-medium text-secondary">自动处置</th>
                <th className="text-center py-2 font-medium text-secondary">启用</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</td>
                  <td className="py-2.5 text-center">
                    <Badge variant={r.level === 'error' ? 'error' : 'warning'} size="sm">
                      {r.level === 'error' ? '严重' : '警告'}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-secondary">{r.channel}</td>
                  <td className="py-2.5 text-secondary">{r.action}</td>
                  <td className="py-2.5 text-center">
                    <Toggle checked={r.enabled} onChange={() => {}} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      <LastModified user="张三" time="2026-05-17 10:15" />
    </Card>
  )
}

function NotifyChannelsTab() {
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [webhookEnabled, setWebhookEnabled] = useState(true)
  const [wechatEnabled, setWechatEnabled] = useState(true)
  const [dingEnabled, setDingEnabled] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader>
          <CardTitle>通知渠道</CardTitle>
          <Badge variant="info">sys_admin, tenant_admin</Badge>
        </CardHeader>
        <CardContent className="space-y-1">
          <FieldRow label="系统站内信" description="顶栏弹窗通知，所有用户默认开启">
            <Toggle checked={true} onChange={() => {}} />
          </FieldRow>
          <FieldRow label="邮件 SMTP" description="通过邮件发送预警通知和报告">
            <Toggle checked={emailEnabled} onChange={() => setEmailEnabled(!emailEnabled)} />
          </FieldRow>
          <FieldRow label="企业微信机器人" description="通过企微群 Webhook 推送通知">
            <Toggle checked={wechatEnabled} onChange={() => setWechatEnabled(!wechatEnabled)} />
          </FieldRow>
          <FieldRow label="钉钉机器人" description="通过钉钉群 Webhook 推送通知">
            <Toggle checked={dingEnabled} onChange={() => setDingEnabled(!dingEnabled)} />
          </FieldRow>
          <FieldRow label="自定义 Webhook" description="支持任意 HTTP Webhook 端点">
            <Toggle checked={webhookEnabled} onChange={() => setWebhookEnabled(!webhookEnabled)} />
          </FieldRow>
          <FieldRow label="短信网关" description="仅旗舰版可用，用于关键告警的短信通知">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" size="sm">旗舰版</Badge>
              <Toggle checked={smsEnabled} onChange={() => setSmsEnabled(!smsEnabled)} />
            </div>
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="p-6">
        <SectionTitle>渠道配置详情</SectionTitle>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>SMTP 服务器</label>
            <Input placeholder="smtp.example.com:465" className="w-full text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>用户名</label>
              <Input placeholder="alert@example.com" className="w-full text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>密码</label>
              <Input type="password" placeholder="********" className="w-full text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Webhook URL</label>
            <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." className="w-full text-sm font-mono" />
          </div>
        </CardContent>
      </Card>
      <LastModified user="张三" time="2026-05-18 14:32" />
    </div>
  )
}

function SSOTab() {
  const [provider, setProvider] = useState('wechat')
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [autoCreate, setAutoCreate] = useState(true)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader>
          <CardTitle>SSO 集成</CardTitle>
          <Badge variant="warning">需重启生效</Badge>
        </CardHeader>
        <CardContent className="space-y-1">
          <FieldRow label="SSO 提供商" description="选择企业使用的单点登录提供商">
            <SelectField value={provider} onChange={setProvider} options={[
              { value: 'wechat', label: '企业微信' },
              { value: 'dingtalk', label: '钉钉' },
              { value: 'ldap', label: 'LDAP / AD' },
              { value: 'oidc', label: 'OIDC (通用)' },
            ]} />
          </FieldRow>
          <FieldRow label="组织架构同步" description="定时从 SSO 源同步组织架构和人员变动">
            <Toggle checked={syncEnabled} onChange={() => setSyncEnabled(!syncEnabled)} />
          </FieldRow>
          <FieldRow label="自动创建账号" description="SSO 用户首次登录时自动在平台创建账号">
            <Toggle checked={autoCreate} onChange={() => setAutoCreate(!autoCreate)} />
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="p-6">
        <SectionTitle>SSO 详细配置</SectionTitle>
        <CardContent className="space-y-4">
          {provider === 'oidc' ? (
            <>
              <Input label="Issuer URL" placeholder="https://accounts.example.com" className="w-full text-sm" />
              <Input label="Client ID" placeholder="aigate-client" className="w-full text-sm" />
              <Input label="Client Secret" type="password" placeholder="********" className="w-full text-sm" />
              <Input label="Redirect URI" placeholder="https://aigate.com/auth/callback" className="w-full text-sm font-mono" />
            </>
          ) : provider === 'ldap' ? (
            <>
              <Input label="LDAP 服务器" placeholder="ldap://10.0.0.1:389" className="w-full text-sm" />
              <Input label="Base DN" placeholder="dc=example,dc=com" className="w-full text-sm font-mono" />
              <Input label="Bind DN" placeholder="cn=admin,dc=example,dc=com" className="w-full text-sm font-mono" />
              <Input label="Bind 密码" type="password" placeholder="********" className="w-full text-sm" />
            </>
          ) : (
            <>
              <Input label={provider === 'wechat' ? 'CorpID' : 'AppKey'} placeholder={provider === 'wechat' ? 'ww1234567890' : 'ding123456'} className="w-full text-sm" />
              <Input label={provider === 'wechat' ? 'AgentID' : 'AppSecret'} placeholder={provider === 'wechat' ? '1000002' : '********'} className="w-full text-sm" />
              <Input label="回调地址" placeholder="https://aigate.com/auth/callback" className="w-full text-sm font-mono" />
            </>
          )}
        </CardContent>
      </Card>

      <Card className="p-6">
        <SectionTitle>账号映射规则</SectionTitle>
        <CardContent>
          <p className="text-xs text-secondary mb-3">
            配置 SSO 用户字段与平台用户字段的映射关系，用于自动创建和同步。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-left py-2 font-medium text-secondary">SSO 字段</th>
                  <th className="text-left py-2 font-medium text-secondary">平台字段</th>
                  <th className="text-center py-2 font-medium text-secondary">必填</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { sso: 'userid', field: '工号', required: true },
                  { sso: 'name', field: '姓名', required: true },
                  { sso: 'email', field: '邮箱', required: true },
                  { sso: 'department', field: '部门', required: false },
                  { sso: 'mobile', field: '手机号', required: false },
                ].map((m) => (
                  <tr key={m.sso} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-2 font-mono text-xs" style={{ color: 'var(--brand-main)' }}>{m.sso}</td>
                    <td className="py-2" style={{ color: 'var(--text-primary)' }}>{m.field}</td>
                    <td className="py-2 text-center">
                      {m.required ? <Check size={14} className="inline text-brand-main" /> : <span className="text-secondary">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <LastModified user="王五" time="2026-05-05 09:00" />
    </div>
  )
}

function SecurityTab() {
  const [pwdStrength, setPwdStrength] = useState('strong')
  const [twoFA, setTwoFA] = useState('admin_only')
  const [sessionTimeout, setSessionTimeout] = useState('8')
  const [ipWhitelist, setIpWhitelist] = useState(false)
  const [fieldMask, setFieldMask] = useState(true)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader>
          <CardTitle>安全策略</CardTitle>
          <Badge variant="warning">敏感变更需二次确认</Badge>
        </CardHeader>
        <CardContent className="space-y-1">
          <FieldRow label="密码强度要求" description="用户密码的最低复杂度要求">
            <SelectField value={pwdStrength} onChange={setPwdStrength} options={[
              { value: 'simple', label: '简单 (8位+)' },
              { value: 'medium', label: '中等 (8位+大小写+数字)' },
              { value: 'strong', label: '强 (12位+大小写+数字+特殊字符)' },
            ]} />
          </FieldRow>
          <FieldRow label="2FA 双因素认证" description="强制要求启用二步验证的范围">
            <SelectField value={twoFA} onChange={setTwoFA} options={[
              { value: 'disabled', label: '不强制' },
              { value: 'admin_only', label: '仅管理员' },
              { value: 'all', label: '所有用户' },
            ]} />
          </FieldRow>
          <FieldRow label="会话超时时长" description="用户无操作后自动登出的时间">
            <SelectField value={sessionTimeout} onChange={setSessionTimeout} options={[
              { value: '2', label: '2 小时' },
              { value: '4', label: '4 小时' },
              { value: '8', label: '8 小时' },
              { value: '24', label: '24 小时' },
            ]} />
          </FieldRow>
          <FieldRow label="全局 IP 段白名单" description="限制平台访问的 IP 地址范围">
            <Toggle checked={ipWhitelist} onChange={() => setIpWhitelist(!ipWhitelist)} />
          </FieldRow>
          <FieldRow label="敏感字段脱敏" description="对手机号、邮箱等字段在非管理员视角下自动脱敏">
            <Toggle checked={fieldMask} onChange={() => setFieldMask(!fieldMask)} />
          </FieldRow>
        </CardContent>
      </Card>

      {ipWhitelist && (
        <Card className="p-6">
          <SectionTitle>IP 白名单配置</SectionTitle>
          <CardContent>
            <p className="text-xs text-secondary mb-3">
              每行一个 CIDR 格式的 IP 地址或 IP 段。留空表示不限制。
            </p>
            <textarea
              className="w-full h-32 p-3 text-sm font-mono rounded-lg resize-y"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder={'10.0.0.0/8\n172.16.0.0/12\n192.168.1.0/24'}
            />
          </CardContent>
        </Card>
      )}
      <LastModified user="张三" time="2026-05-19 11:20" />
    </div>
  )
}

function AuditRetentionTab() {
  const [callLogDays, setCallLogDays] = useState('180')
  const [opLogDays, setOpLogDays] = useState('365')
  const [exportEnabled, setExportEnabled] = useState(true)
  const [watermark, setWatermark] = useState(true)

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>审计保留策略</CardTitle>
        <Badge variant="warning">敏感变更需二次确认</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <FieldRow label="调用日志保留期" description="API 调用日志的保留天数，到期后自动清理">
          <SelectField value={callLogDays} onChange={setCallLogDays} options={[
            { value: '30', label: '30 天' },
            { value: '90', label: '90 天' },
            { value: '180', label: '180 天（默认）' },
            { value: '365', label: '365 天' },
          ]} />
        </FieldRow>
        <FieldRow label="操作审计日志保留期" description="用户操作审计日志的保留天数">
          <SelectField value={opLogDays} onChange={setOpLogDays} options={[
            { value: '180', label: '180 天' },
            { value: '365', label: '365 天（默认）' },
            { value: '730', label: '730 天' },
          ]} />
        </FieldRow>
        <FieldRow label="允许导出审计日志" description="管理员可导出审计日志用于合规审查">
          <Toggle checked={exportEnabled} onChange={() => setExportEnabled(!exportEnabled)} />
        </FieldRow>
        <FieldRow label="导出文件水印" description="导出的 Excel/CSV/PDF 自带操作人、时间、租户名水印">
          <Toggle checked={watermark} onChange={() => setWatermark(!watermark)} />
        </FieldRow>
      </CardContent>
      <p className="text-xs mt-4 px-1 py-2 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--brand-accent)' }}>
        注意：缩短保留期属于不可逆操作，已被清理的日志无法恢复。该操作将记录到操作审计日志。
      </p>
      <LastModified user="张三" time="2026-05-14 08:50" />
    </Card>
  )
}

function RAGDefaultTab() {
  const [chunkSize, setChunkSize] = useState('512')
  const [overlap, setOverlap] = useState('64')
  const [embedModel, setEmbedModel] = useState('text-embedding-3-small')
  const [rerankModel, setRerankModel] = useState('bge-reranker-v2')
  const [topK, setTopK] = useState('5')

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>RAG 默认策略</CardTitle>
        <Badge variant="info">新建知识库时的默认参数</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <FieldRow label="默认分块大小 (Chunk Size)" description="文档切分时每个块的目标 Token 数">
          <SelectField value={chunkSize} onChange={setChunkSize} options={[
            { value: '256', label: '256 Tokens' },
            { value: '512', label: '512 Tokens（推荐）' },
            { value: '1024', label: '1024 Tokens' },
            { value: '2048', label: '2048 Tokens' },
          ]} />
        </FieldRow>
        <FieldRow label="默认重叠 Token (Overlap)" description="相邻块之间的重叠 Token 数，用于保持上下文连续性">
          <SelectField value={overlap} onChange={setOverlap} options={[
            { value: '0', label: '0 (不重叠)' },
            { value: '32', label: '32 Tokens' },
            { value: '64', label: '64 Tokens（推荐）' },
            { value: '128', label: '128 Tokens' },
          ]} />
        </FieldRow>
        <FieldRow label="默认嵌入模型 (Embedding)" description="用于将文本向量化的模型">
          <SelectField value={embedModel} onChange={setEmbedModel} options={[
            { value: 'text-embedding-3-small', label: 'OpenAI text-embedding-3-small' },
            { value: 'text-embedding-3-large', label: 'OpenAI text-embedding-3-large' },
            { value: 'bge-m3', label: 'BAAI bge-m3' },
          ]} />
        </FieldRow>
        <FieldRow label="默认 Rerank 模型" description="用于对检索结果重排序的模型">
          <SelectField value={rerankModel} onChange={setRerankModel} options={[
            { value: 'bge-reranker-v2', label: 'BAAI bge-reranker-v2-m3' },
            { value: 'cohere-rerank', label: 'Cohere Rerank v3' },
            { value: 'none', label: '不使用 Rerank' },
          ]} />
        </FieldRow>
        <FieldRow label="默认 Top-K" description="检索时返回的最相关文档数量">
          <SelectField value={topK} onChange={setTopK} options={[
            { value: '3', label: '3' },
            { value: '5', label: '5（推荐）' },
            { value: '10', label: '10' },
            { value: '20', label: '20' },
          ]} />
        </FieldRow>
      </CardContent>
      <LastModified user="赵六" time="2026-05-16 15:40" />
    </Card>
  )
}

function MarketplaceTab() {
  const [defaultVisibility, setDefaultVisibility] = useState('authorized')
  const [publicEnabled, setPublicEnabled] = useState(false)
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [autoScan, setAutoScan] = useState(true)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader>
          <CardTitle>资产市场默认策略</CardTitle>
          <Badge variant="info">MCP / Skills / Plugins / Hooks / Prompts</Badge>
        </CardHeader>
        <CardContent className="space-y-1">
          <FieldRow label="新资产默认可见性" description="新注册资产的初始可见范围">
            <SelectField value={defaultVisibility} onChange={setDefaultVisibility} options={[
              { value: 'all', label: '全员可见' },
              { value: 'authorized', label: '需授权（推荐）' },
              { value: 'private', label: '仅创建者' },
            ]} />
          </FieldRow>
          <FieldRow label="启用公共市场" description="是否允许用户浏览和开通公共市场中的资产">
            <Toggle checked={publicEnabled} onChange={() => setPublicEnabled(!publicEnabled)} />
          </FieldRow>
          <FieldRow label="资产上架需审核" description="新资产上架前需要管理员审核">
            <Toggle checked={approvalRequired} onChange={() => setApprovalRequired(!approvalRequired)} />
          </FieldRow>
          <FieldRow label="上架前自动安全扫描" description="对代码类资产（Plugin / Hook）自动进行安全扫描">
            <Toggle checked={autoScan} onChange={() => setAutoScan(!autoScan)} />
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="p-6">
        <SectionTitle>各类型资产默认配置</SectionTitle>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-left py-2 font-medium text-secondary">资产类型</th>
                  <th className="text-center py-2 font-medium text-secondary">默认可见性</th>
                  <th className="text-center py-2 font-medium text-secondary">需审核</th>
                  <th className="text-center py-2 font-medium text-secondary">安全扫描</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: '提示词 (Prompts)', visibility: '需授权', audit: true, scan: false },
                  { type: 'MCP 工具', visibility: '需授权', audit: true, scan: true },
                  { type: 'Skills 技能', visibility: '需授权', audit: true, scan: true },
                  { type: 'Plugins 插件', visibility: '需授权', audit: true, scan: true },
                  { type: 'Hooks 钩子', visibility: '仅创建者', audit: true, scan: true },
                ].map((a) => (
                  <tr key={a.type} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{a.type}</td>
                    <td className="py-2.5 text-center text-secondary">{a.visibility}</td>
                    <td className="py-2.5 text-center">{a.audit ? <Check size={14} className="inline text-brand-main" /> : '-'}</td>
                    <td className="py-2.5 text-center">{a.scan ? <Check size={14} className="inline text-brand-main" /> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <LastModified user="张三" time="2026-05-13 17:00" />
    </div>
  )
}

/* ---------- Tab 内容映射 ---------- */

const tabContent: Record<string, React.FC> = {
  basic: BasicInfoTab,
  quota: QuotaRulesTab,
  'key-default': KeyDefaultTab,
  'model-whitelist': ModelWhitelistTab,
  'alert-rules': AlertRulesTab,
  'notify-channels': NotifyChannelsTab,
  sso: SSOTab,
  security: SecurityTab,
  'audit-retention': AuditRetentionTab,
  'rag-default': RAGDefaultTab,
  marketplace: MarketplaceTab,
}

/* ---------- 主页面 ---------- */

export default function Settings() {
  const [activeTab, setActiveTab] = useState('basic')
  const currentTab = tabs.find((t) => t.id === activeTab)!

  const TabPanel = tabContent[activeTab]

  return (
    <div>
      <PageHeader
        title="系统设置"
        subtitle={currentTab.description}
        breadcrumbs={[{ label: '系统' }, { label: '系统设置' }]}
        actions={
          <Button icon={<Save size={16} />}>保存配置</Button>
        }
      />

      <div className="flex gap-6">
        {/* 左侧 Tab 导航 */}
        <nav
          className="w-60 flex-shrink-0 sticky top-24 self-start rounded-xl p-2 space-y-0.5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === tab.id ? 'var(--brand-main)' : 'var(--text-secondary)',
                borderLeft: activeTab === tab.id ? '2px solid var(--brand-main)' : '2px solid transparent',
              }}
            >
              <span className="flex-shrink-0" style={{ color: activeTab === tab.id ? 'var(--brand-main)' : 'var(--text-secondary)' }}>
                {tab.icon}
              </span>
              <span className="flex-1">{tab.label}</span>
              {activeTab === tab.id && (
                <ChevronRight size={14} style={{ color: 'var(--brand-main)' }} />
              )}
            </button>
          ))}
        </nav>

        {/* 右侧配置表单 */}
        <div className="flex-1 min-w-0">
          {TabPanel && <TabPanel />}
        </div>
      </div>
    </div>
  )
}
