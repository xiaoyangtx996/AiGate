import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Building2,
  Globe,
  Wallet,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StepDef {
  id: number
  label: string
  icon: React.ReactNode
}

const STEPS: StepDef[] = [
  { id: 1, label: '集团入驻', icon: <Building2 size={16} /> },
  { id: 2, label: '配额分配', icon: <Wallet size={16} /> },
  { id: 3, label: '渠道配置', icon: <Globe size={16} /> },
  { id: 4, label: '成员邀请', icon: <Users size={16} /> },
]

const CHANNEL_OPTIONS = [
  { value: 'openai', label: 'OpenAI Official', keyLabel: 'OpenAI API Key' },
  { value: 'deepseek', label: 'Deepseek AI', keyLabel: 'Deepseek API Key' },
]

const ROLE_OPTIONS = [
  { value: 'tenant_admin', label: '租户二级管理员' },
  { value: 'user', label: '普通开发成员' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [corpName, setCorpName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [deptName, setDeptName] = useState('技术研发中心')
  const [deptQuota, setDeptQuota] = useState('10000')
  const [channelProvider, setChannelProvider] = useState('openai')
  const [channelKey, setChannelKey] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('tenant_admin')

  /* ------ navigation ------ */

  function handleNext() {
    if (currentStep === 1 && !corpName.trim()) {
      alert('请输入您的企业全称！')
      return
    }
    if (currentStep === 3 && !channelKey.trim()) {
      alert('请填写 API Key 以供自动测试联通性！')
      return
    }
    if (currentStep === 4) {
      alert('[入驻向导成功] 您的集团租户已初始开通，测试网关连通性 100% 成功！欢迎进入控制台。')
      window.location.href = '/dashboard'
      return
    }
    setCurrentStep((s) => Math.min(s + 1, 4))
  }

  function handlePrev() {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  /* ------ derived ------ */

  const channelKeyLabel =
    CHANNEL_OPTIONS.find((o) => o.value === channelProvider)?.keyLabel ?? 'API Key'

  /* ------ render ------ */

  return (
    <div>
      <PageHeader
        title="首次入驻向导"
        subtitle="仅需 4 步即可配置好您的企业级多租户 AI 安全网关。"
        breadcrumbs={[{ label: '系统' }, { label: '首次入驻向导' }]}
        actions={<span className="text-sm font-bold text-brand-main">步骤 {currentStep} / 4</span>}
      />

      {/* Step indicator tabs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STEPS.map((step) => {
          const isActive = step.id === currentStep
          const isDone = step.id < currentStep
          return (
            <button
              key={step.id}
              className="flex items-center gap-2 pb-2 border-b-4 text-sm font-bold transition-colors"
              style={{
                borderColor: isActive ? 'var(--brand-main)' : 'var(--border-color)',
                color: isActive ? 'var(--brand-main)' : isDone ? 'var(--brand-main)' : 'var(--text-secondary)',
              }}
              onClick={() => {
                // allow clicking back to completed steps
                if (step.id < currentStep) setCurrentStep(step.id)
              }}
            >
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs shrink-0"
                style={{
                  background: isActive || isDone ? 'var(--brand-main)' : 'var(--border-color)',
                  color: isActive || isDone ? 'var(--bg-body)' : 'var(--text-secondary)',
                }}
              >
                {isDone ? <Check size={12} /> : step.id}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Wizard card */}
      <Card className="p-8 max-w-2xl mx-auto min-h-[400px] flex flex-col justify-between">
        {/* Step content */}
        <div className="space-y-4">
          {currentStep === 1 && <StepCorpName corpName={corpName} subdomain={subdomain} onCorpNameChange={setCorpName} onSubdomainChange={setSubdomain} />}
          {currentStep === 2 && <StepQuota deptName={deptName} deptQuota={deptQuota} onDeptNameChange={setDeptName} onDeptQuotaChange={setDeptQuota} />}
          {currentStep === 3 && <StepChannel channelProvider={channelProvider} channelKey={channelKey} channelKeyLabel={channelKeyLabel} onProviderChange={setChannelProvider} onKeyChange={setChannelKey} />}
          {currentStep === 4 && <StepInvite memberEmail={memberEmail} memberRole={memberRole} onEmailChange={setMemberEmail} onRoleChange={setMemberRole} />}
        </div>

        {/* Footer controls */}
        <div
          className="flex justify-between items-center mt-8 pt-6 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={currentStep === 1}
            onClick={handlePrev}
            icon={<ChevronLeft size={14} />}
          >
            上一步
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            icon={currentStep === 4 ? <Check size={14} /> : <ChevronRight size={14} />}
          >
            {currentStep === 4 ? '完成并进入控制台' : '下一步'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step sub-components                                                */
/* ------------------------------------------------------------------ */

interface StepCorpNameProps {
  corpName: string
  subdomain: string
  onCorpNameChange: (v: string) => void
  onSubdomainChange: (v: string) => void
}

function StepCorpName({ corpName, subdomain, onCorpNameChange, onSubdomainChange }: StepCorpNameProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <Building2 size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold">创建企业与首个租户</h2>
          <p className="text-sm text-secondary">
            请输入您的集团企业全称及期望分配的集团级二级域名后缀，网关将据此配置独立的 SSO 与隔离边界。
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            企业全称
          </label>
          <input
            type="text"
            className="input-base w-full"
            placeholder="例如：北京小洋网络科技有限公司"
            value={corpName}
            onChange={(e) => onCorpNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            子域名空间
          </label>
          <div className="flex">
            <input
              type="text"
              className="input-base rounded-r-none border-r-0 flex-1"
              placeholder="xiaoyang"
              value={subdomain}
              onChange={(e) => onSubdomainChange(e.target.value)}
            />
            <span
              className="inline-flex items-center px-4 rounded-r-lg border border-l-0 text-sm text-secondary font-mono"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              .aigate.company.com
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

interface StepQuotaProps {
  deptName: string
  deptQuota: string
  onDeptNameChange: (v: string) => void
  onDeptQuotaChange: (v: string) => void
}

function StepQuota({ deptName, deptQuota, onDeptNameChange, onDeptQuotaChange }: StepQuotaProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <Wallet size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold">设定初始组织配额</h2>
          <p className="text-sm text-secondary">
            网关采用守恒配额制。为您的首个部门（如：技术研发中心）划拨本月初始可用额度。
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            首个部门名称
          </label>
          <input
            type="text"
            className="input-base w-full"
            value={deptName}
            onChange={(e) => onDeptNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            月度预算上限 (元)
          </label>
          <input
            type="number"
            className="input-base w-full font-mono font-bold text-brand-main"
            value={deptQuota}
            onChange={(e) => onDeptQuotaChange(e.target.value)}
          />
        </div>
      </div>
    </>
  )
}

interface StepChannelProps {
  channelProvider: string
  channelKey: string
  channelKeyLabel: string
  onProviderChange: (v: string) => void
  onKeyChange: (v: string) => void
}

function StepChannel({ channelProvider, channelKey, channelKeyLabel, onProviderChange, onKeyChange }: StepChannelProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <Globe size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold">配置基础大模型渠道</h2>
          <p className="text-sm text-secondary">
            选择您要激活并暴露给首个租户的模型，输入相应的 API Key。我们将为您执行自动化联通性测试。
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            大模型渠道商
          </label>
          <select
            className="input-base w-full"
            value={channelProvider}
            onChange={(e) => onProviderChange(e.target.value)}
          >
            {CHANNEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            {channelKeyLabel}
          </label>
          <input
            type="password"
            className="input-base w-full font-mono"
            placeholder="sk-...................."
            value={channelKey}
            onChange={(e) => onKeyChange(e.target.value)}
          />
        </div>
      </div>
    </>
  )
}

interface StepInviteProps {
  memberEmail: string
  memberRole: string
  onEmailChange: (v: string) => void
  onRoleChange: (v: string) => void
}

function StepInvite({ memberEmail, memberRole, onEmailChange, onRoleChange }: StepInviteProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <Users size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold">邀请核心团队成员</h2>
          <p className="text-sm text-secondary">
            邀请研发主管或前端骨干加入。被邀请人员将收到带有专用 API 密钥接入链接的通知邮件。
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            成员邮箱地址
          </label>
          <input
            type="email"
            className="input-base w-full"
            placeholder="leader@company.com"
            value={memberEmail}
            onChange={(e) => onEmailChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1.5">
            分配初始角色
          </label>
          <select
            className="input-base w-full"
            value={memberRole}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}
