import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Stepper } from '@/components/ui/Stepper'
import {
  Building2,
  Wallet,
  Puzzle,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Check,
  Upload,
  FileSpreadsheet,
  Link2,
  Globe,
  Plus,
  X,
  Mail,
  AlertCircle,
  CheckCircle2,
  Rocket,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEP_DEFS = [
  { id: 'org', title: '建立组织架构', description: '上传 CSV 或对接 SSO 同步' },
  { id: 'quota', title: '配置全局配额', description: '设置集团总 Token 配额' },
  { id: 'mcp', title: '开通基础 MCP 工具', description: '从公共市场选 1-3 个核心工具' },
  { id: 'invite', title: '邀请第一批管理员', description: '输入邮箱列表发送邀请' },
]

interface McpToolOption {
  id: string
  name: string
  description: string
  icon: string
  category: string
}

const MCP_TOOLS: McpToolOption[] = [
  { id: 'feishu', name: '飞书', description: '飞书文档、日历、审批自动化', icon: 'F', category: '协作' },
  { id: 'github', name: 'GitHub', description: '代码仓库、Issue、PR 管理', icon: 'G', category: '开发' },
  { id: 'erp', name: '内部 ERP', description: '企业资源计划系统对接', icon: 'E', category: '业务' },
  { id: 'dingtalk', name: '钉钉', description: '钉钉消息、审批、日程', icon: 'D', category: '协作' },
  { id: 'gitlab', name: 'GitLab', description: '代码托管与 CI/CD 管理', icon: 'L', category: '开发' },
  { id: 'jira', name: 'Jira', description: '项目管理与任务跟踪', icon: 'J', category: '项目' },
  { id: 'confluence', name: 'Confluence', description: '知识库与文档协作', icon: 'C', category: '知识' },
  { id: 'slack', name: 'Slack', description: '团队即时通讯集成', icon: 'S', category: '协作' },
]

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrgNode {
  level: string
  name: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  /* Step 1 - Organization */
  const [syncMethod, setSyncMethod] = useState<'csv' | 'sso'>('csv')
  const [orgName, setOrgName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [ssoProvider, setSsoProvider] = useState('ldap')
  const [orgTree, setOrgTree] = useState<OrgNode[]>([
    { level: '集团', name: '' },
    { level: '分公司', name: '' },
    { level: '部门', name: '' },
  ])

  /* Step 2 - Quota */
  const [totalQuota, setTotalQuota] = useState('1000000')
  const [allocations, setAllocations] = useState<{ name: string; quota: string }[]>([
    { name: '技术研发中心', quota: '500000' },
    { name: '产品设计部', quota: '300000' },
    { name: '市场营销部', quota: '200000' },
  ])

  /* Step 3 - MCP Tools */
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  /* Step 4 - Invite */
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)

  /* ------ validation ------ */

  function validateStep(step: number): boolean {
    switch (step) {
      case 0:
        if (!orgName.trim()) {
          alert('请输入集团名称')
          return false
        }
        if (syncMethod === 'csv' && !csvFileName) {
          alert('请上传组织架构 CSV 文件')
          return false
        }
        return true
      case 1:
        if (!totalQuota || Number(totalQuota) <= 0) {
          alert('请设置有效的集团总配额')
          return false
        }
        return true
      case 2:
        // MCP is optional (skippable)
        return true
      case 3:
        // Invite is optional (skippable)
        return true
      default:
        return true
    }
  }

  /* ------ navigation ------ */

  function handleNext() {
    if (!validateStep(currentStep)) return
    if (currentStep === 3) {
      handleComplete()
      return
    }
    setCurrentStep((s) => Math.min(s + 1, 3))
  }

  function handlePrev() {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  function handleSkip() {
    if (currentStep === 3) {
      handleComplete()
    } else {
      setCurrentStep((s) => Math.min(s + 1, 3))
    }
  }

  function handleComplete() {
    // In production, this would POST all collected data to the API
    navigate('/dashboard', {
      state: { onboardingComplete: true },
    })
  }

  /* ------ CSV upload ------ */

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFileName(file.name)
      // In production, parse CSV and populate orgTree
    }
  }

  /* ------ Org tree ------ */

  function handleOrgTreeChange(index: number, value: string) {
    setOrgTree((prev) =>
      prev.map((node, i) => (i === index ? { ...node, name: value } : node))
    )
  }

  function addOrgLevel() {
    const levels = ['集团', '分公司', '部门', '项目组']
    if (orgTree.length < 4) {
      setOrgTree((prev) => [...prev, { level: levels[prev.length] || '子级', name: '' }])
    }
  }

  /* ------ Quota allocation ------ */

  function handleAllocationChange(index: number, field: 'name' | 'quota', value: string) {
    setAllocations((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    )
  }

  function addAllocation() {
    setAllocations((prev) => [...prev, { name: '', quota: '' }])
  }

  function removeAllocation(index: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== index))
  }

  const allocatedTotal = allocations.reduce((sum, a) => sum + (Number(a.quota) || 0), 0)
  const remainingQuota = Number(totalQuota) - allocatedTotal

  /* ------ MCP tools ------ */

  function toggleTool(toolId: string) {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : prev.length < 3 ? [...prev, toolId] : prev
    )
  }

  /* ------ Email invite ------ */

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail()
    }
  }

  function addEmail() {
    const raw = emailInput.trim().replace(/,$/, '')
    if (!raw) return
    if (!isValidEmail(raw)) {
      setEmailError('请输入有效的邮箱地址')
      return
    }
    if (emails.includes(raw)) {
      setEmailError('该邮箱已添加')
      return
    }
    setEmails((prev) => [...prev, raw])
    setEmailInput('')
    setEmailError('')
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email))
  }

  /* ------ render ------ */

  return (
    <div>
      <PageHeader
        title="首次入驻向导"
        subtitle="仅需 4 步即可完成企业级 AI 网关的初始配置，每步均可保存草稿后退出。"
        breadcrumbs={[{ label: '系统' }, { label: '首次入驻向导' }]}
        actions={
          <span className="text-sm font-bold" style={{ color: 'var(--brand-main)' }}>
            步骤 {currentStep + 1} / 4
          </span>
        }
      />

      {/* Stepper */}
      <Stepper
        steps={STEP_DEFS}
        currentStep={currentStep}
        className="mb-8"
      />

      {/* Wizard card */}
      <Card className="p-8 max-w-3xl mx-auto">
        {/* Step content */}
        <div className="min-h-[420px]">
          {currentStep === 0 && (
            <StepOrganization
              syncMethod={syncMethod}
              orgName={orgName}
              subdomain={subdomain}
              csvFileName={csvFileName}
              ssoProvider={ssoProvider}
              orgTree={orgTree}
              onSyncMethodChange={setSyncMethod}
              onOrgNameChange={setOrgName}
              onSubdomainChange={setSubdomain}
              onSsoProviderChange={setSsoProvider}
              onOrgTreeChange={handleOrgTreeChange}
              onAddOrgLevel={addOrgLevel}
              onFileSelect={handleFileSelect}
              fileInputRef={fileInputRef}
            />
          )}
          {currentStep === 1 && (
            <StepQuota
              totalQuota={totalQuota}
              allocations={allocations}
              remainingQuota={remainingQuota}
              onTotalQuotaChange={setTotalQuota}
              onAllocationChange={handleAllocationChange}
              onAddAllocation={addAllocation}
              onRemoveAllocation={removeAllocation}
            />
          )}
          {currentStep === 2 && (
            <StepMcpTools
              tools={MCP_TOOLS}
              selectedTools={selectedTools}
              onToggleTool={toggleTool}
            />
          )}
          {currentStep === 3 && (
            <StepInvite
              emails={emails}
              emailInput={emailInput}
              emailError={emailError}
              onEmailInputChange={setEmailInput}
              onEmailInputKeyDown={handleEmailKeyDown}
              onAddEmail={addEmail}
              onRemoveEmail={removeEmail}
              onClearEmailError={() => setEmailError('')}
              emailInputRef={emailInputRef}
            />
          )}
        </div>

        {/* Footer controls */}
        <div
          className="flex justify-between items-center mt-8 pt-6 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={currentStep === 0}
            onClick={handlePrev}
            icon={<ChevronLeft size={14} />}
          >
            上一步
          </Button>

          <div className="flex items-center gap-3">
            {/* Skip button for optional steps (MCP and Invite) */}
            {(currentStep === 2 || currentStep === 3) && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                跳过此步
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              icon={currentStep === 3 ? <Rocket size={14} /> : <ChevronRight size={14} />}
            >
              {currentStep === 3 ? '完成入驻并进入控制台' : '下一步'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 1 - Organization                                              */
/* ------------------------------------------------------------------ */

interface StepOrganizationProps {
  syncMethod: 'csv' | 'sso'
  orgName: string
  subdomain: string
  csvFileName: string
  ssoProvider: string
  orgTree: OrgNode[]
  onSyncMethodChange: (v: 'csv' | 'sso') => void
  onOrgNameChange: (v: string) => void
  onSubdomainChange: (v: string) => void
  onSsoProviderChange: (v: string) => void
  onOrgTreeChange: (index: number, value: string) => void
  onAddOrgLevel: () => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

function StepOrganization({
  syncMethod,
  orgName,
  subdomain,
  csvFileName,
  ssoProvider,
  orgTree,
  onSyncMethodChange,
  onOrgNameChange,
  onSubdomainChange,
  onSsoProviderChange,
  onOrgTreeChange,
  onAddOrgLevel,
  onFileSelect,
  fileInputRef,
}: StepOrganizationProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <Building2 size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            建立组织架构
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            配置集团、分公司与部门的层级结构，至少需包含集团到部门三级。
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Corp name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            集团名称 <span style={{ color: 'var(--brand-accent)' }}>*</span>
          </label>
          <input
            type="text"
            className="input-base w-full"
            placeholder="例如：北京小洋网络科技有限公司"
            value={orgName}
            onChange={(e) => onOrgNameChange(e.target.value)}
          />
        </div>

        {/* Subdomain */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            企业子域名
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
              className="inline-flex items-center px-4 rounded-r-lg border border-l-0 text-sm font-mono"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              .aigate.company.com
            </span>
          </div>
        </div>

        {/* Sync method tabs */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            组织数据来源
          </label>
          <div className="flex gap-2 mb-4">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: syncMethod === 'csv' ? 'var(--brand-main)' : 'var(--border-color)',
                background: syncMethod === 'csv' ? 'var(--brand-main)' : 'transparent',
                color: syncMethod === 'csv' ? 'var(--bg-body)' : 'var(--text-secondary)',
              }}
              onClick={() => onSyncMethodChange('csv')}
            >
              <FileSpreadsheet size={16} />
              上传 CSV
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: syncMethod === 'sso' ? 'var(--brand-main)' : 'var(--border-color)',
                background: syncMethod === 'sso' ? 'var(--brand-main)' : 'transparent',
                color: syncMethod === 'sso' ? 'var(--bg-body)' : 'var(--text-secondary)',
              }}
              onClick={() => onSyncMethodChange('sso')}
            >
              <Link2 size={16} />
              SSO 同步
            </button>
          </div>

          {syncMethod === 'csv' ? (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-brand-main"
              style={{ borderColor: csvFileName ? 'var(--brand-main)' : 'var(--border-color)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={onFileSelect}
              />
              {csvFileName ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={20} style={{ color: 'var(--brand-main)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{csvFileName}</span>
                  <Badge variant="success" size="sm">已上传</Badge>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    点击或拖拽上传组织架构文件
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    支持 CSV / Excel，表头需包含：姓名、邮箱、部门、角色
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  SSO 提供商
                </label>
                <select
                  className="input-base w-full"
                  value={ssoProvider}
                  onChange={(e) => onSsoProviderChange(e.target.value)}
                >
                  <option value="ldap">LDAP / Active Directory</option>
                  <option value="oidc">OpenID Connect (OIDC)</option>
                  <option value="wechat">企业微信</option>
                  <option value="dingtalk">钉钉</option>
                  <option value="feishu">飞书</option>
                </select>
              </div>
              <div
                className="flex items-start gap-2 p-3 rounded-lg text-sm"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-accent)' }} />
                <span>SSO 同步将自动拉取已有组织架构与成员信息，无需手动维护。</span>
              </div>
            </div>
          )}
        </div>

        {/* Org tree preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              组织层级结构
            </label>
            {orgTree.length < 4 && (
              <button
                className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--brand-main)' }}
                onClick={onAddOrgLevel}
              >
                <Plus size={12} />
                添加层级
              </button>
            )}
          </div>
          <div className="space-y-2">
            {orgTree.map((node, index) => (
              <div key={index} className="flex items-center gap-3">
                <span
                  className="w-16 text-xs font-bold text-right flex-shrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {node.level}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  {index > 0 && (
                    <span style={{ color: 'var(--border-color)' }}>|__</span>
                  )}
                  <input
                    type="text"
                    className="input-base flex-1"
                    placeholder={`请输入${node.level}名称`}
                    value={node.name}
                    onChange={(e) => onOrgTreeChange(index, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 2 - Quota                                                     */
/* ------------------------------------------------------------------ */

interface StepQuotaProps {
  totalQuota: string
  allocations: { name: string; quota: string }[]
  remainingQuota: number
  onTotalQuotaChange: (v: string) => void
  onAllocationChange: (index: number, field: 'name' | 'quota', value: string) => void
  onAddAllocation: () => void
  onRemoveAllocation: (index: number) => void
}

function StepQuota({
  totalQuota,
  allocations,
  remainingQuota,
  onTotalQuotaChange,
  onAllocationChange,
  onAddAllocation,
  onRemoveAllocation,
}: StepQuotaProps) {
  const allocatedTotal = allocations.reduce((sum, a) => sum + (Number(a.quota) || 0), 0)
  const usagePercent = Number(totalQuota) > 0 ? Math.round((allocatedTotal / Number(totalQuota)) * 100) : 0

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <Wallet size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            配置全局配额
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            设置集团总 Token 配额，并分配给已建分公司。配额采用守恒制，已分配额度不可超出总额。
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Total quota */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            集团月度总配额（Token）
          </label>
          <input
            type="number"
            className="input-base w-full font-mono text-lg font-bold"
            style={{ color: 'var(--brand-main)' }}
            value={totalQuota}
            onChange={(e) => onTotalQuotaChange(e.target.value)}
            placeholder="1000000"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            建议根据月均 AI 调用量设置，后续可随时调整
          </p>
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              配额分配情况
            </span>
            <span className="text-sm font-mono font-bold" style={{ color: remainingQuota < 0 ? 'var(--brand-accent)' : 'var(--brand-main)' }}>
              已分配 {usagePercent}%
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--border-color)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                background: remainingQuota < 0 ? 'var(--brand-accent)' : 'var(--brand-main)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              已分配: {allocatedTotal.toLocaleString()} Token
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: remainingQuota < 0 ? 'var(--brand-accent)' : 'var(--text-secondary)' }}
            >
              剩余: {remainingQuota.toLocaleString()} Token
            </span>
          </div>
        </div>

        {/* Allocations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              分公司配额分配
            </label>
            <button
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--brand-main)' }}
              onClick={onAddAllocation}
            >
              <Plus size={12} />
              添加分公司
            </button>
          </div>
          <div className="space-y-2">
            {allocations.map((alloc, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'var(--bg-surface)' }}
              >
                <input
                  type="text"
                  className="input-base flex-1"
                  placeholder="分公司/部门名称"
                  value={alloc.name}
                  onChange={(e) => onAllocationChange(index, 'name', e.target.value)}
                />
                <input
                  type="number"
                  className="input-base w-40 font-mono font-bold"
                  style={{ color: 'var(--brand-main)' }}
                  placeholder="配额"
                  value={alloc.quota}
                  onChange={(e) => onAllocationChange(index, 'quota', e.target.value)}
                />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Token</span>
                {allocations.length > 1 && (
                  <button
                    className="p-1 rounded transition-colors hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => onRemoveAllocation(index)}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {remainingQuota < 0 && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg text-sm"
            style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--brand-accent)' }}
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>已分配总额超出集团总配额，请调整后再继续。</span>
          </div>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 3 - MCP Tools                                                 */
/* ------------------------------------------------------------------ */

interface StepMcpToolsProps {
  tools: McpToolOption[]
  selectedTools: string[]
  onToggleTool: (id: string) => void
}

function StepMcpTools({ tools, selectedTools, onToggleTool }: StepMcpToolsProps) {
  const categories = [...new Set(tools.map((t) => t.category))]

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <Puzzle size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              开通基础 MCP 工具
            </h2>
            <Badge variant="info" size="sm">可跳过</Badge>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            从公共市场选择 1-3 个核心工具，开通后即可在 Agent 和 Prompt 中使用。
          </p>
        </div>
      </div>

      {/* Selection counter */}
      <div
        className="flex items-center justify-between p-3 rounded-lg mb-5"
        style={{ background: 'var(--bg-surface)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          已选择 <span className="font-bold font-mono" style={{ color: 'var(--brand-main)' }}>{selectedTools.length}</span> / 3 个工具
        </span>
        {selectedTools.length > 0 && (
          <div className="flex gap-1">
            {selectedTools.map((id) => {
              const tool = tools.find((t) => t.id === id)
              return tool ? (
                <Badge key={id} variant="success" size="sm">{tool.name}</Badge>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Tools by category */}
      <div className="space-y-5">
        {categories.map((category) => (
          <div key={category}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
              {category}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tools
                .filter((t) => t.category === category)
                .map((tool) => {
                  const isSelected = selectedTools.includes(tool.id)
                  const isDisabled = !isSelected && selectedTools.length >= 3
                  return (
                    <button
                      key={tool.id}
                      className="flex items-start gap-3 p-4 rounded-lg border text-left transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--brand-main)' : 'var(--border-color)',
                        background: isSelected ? 'var(--bg-surface)' : 'transparent',
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => !isDisabled && onToggleTool(tool.id)}
                      disabled={isDisabled}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{
                          background: isSelected ? 'var(--brand-main)' : 'var(--bg-surface)',
                          color: isSelected ? 'var(--bg-body)' : 'var(--text-secondary)',
                        }}
                      >
                        {tool.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {tool.name}
                          </span>
                          {isSelected && <Check size={14} style={{ color: 'var(--brand-main)' }} />}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {tool.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex items-start gap-2 p-3 rounded-lg text-sm mt-5"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
      >
        <Globe size={16} className="mt-0.5 flex-shrink-0" />
        <span>更多工具可在入驻完成后，前往 <strong>AI 资产市场</strong> 继续安装。</span>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 4 - Invite                                                    */
/* ------------------------------------------------------------------ */

interface StepInviteProps {
  emails: string[]
  emailInput: string
  emailError: string
  onEmailInputChange: (v: string) => void
  onEmailInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onAddEmail: () => void
  onRemoveEmail: (email: string) => void
  onClearEmailError: () => void
  emailInputRef: React.RefObject<HTMLInputElement>
}

function StepInvite({
  emails,
  emailInput,
  emailError,
  onEmailInputChange,
  onEmailInputKeyDown,
  onAddEmail,
  onRemoveEmail,
  onClearEmailError,
  emailInputRef,
}: StepInviteProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-main)', color: 'var(--bg-body)' }}
        >
          <UserPlus size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              邀请第一批管理员
            </h2>
            <Badge variant="info" size="sm">可跳过</Badge>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            输入管理员邮箱列表，系统将自动发送包含接入链接的邀请邮件。
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Email input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            邮箱地址（支持批量输入，按 Enter 添加）
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                ref={emailInputRef}
                type="email"
                className="input-base w-full pl-10"
                placeholder="admin@company.com"
                value={emailInput}
                onChange={(e) => {
                  onEmailInputChange(e.target.value)
                  onClearEmailError()
                }}
                onKeyDown={onEmailInputKeyDown}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={onAddEmail} icon={<Plus size={14} />}>
              添加
            </Button>
          </div>
          {emailError && (
            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--brand-accent)' }}>
              <AlertCircle size={12} />
              {emailError}
            </p>
          )}
        </div>

        {/* Email list */}
        {emails.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                待邀请列表
              </label>
              <Badge variant="success" size="sm">{emails.length} 人</Badge>
            </div>
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--bg-surface)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{email}</span>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>管理员</p>
                    </div>
                  </div>
                  <button
                    className="p-1 rounded transition-colors hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => onRemoveEmail(email)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {emails.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Mail size={32} className="mb-2" />
            <p className="text-sm">暂无邀请成员</p>
            <p className="text-xs mt-1">输入邮箱后按 Enter 添加</p>
          </div>
        )}

        <div
          className="flex items-start gap-2 p-3 rounded-lg text-sm"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-accent)' }} />
          <span>被邀请人将收到邮件通知，包含临时密码和 API 密钥接入链接。邀请后可在用户管理页面调整角色和权限。</span>
        </div>
      </div>
    </>
  )
}
