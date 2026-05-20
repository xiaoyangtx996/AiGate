import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  CreditCard,
  Clock,
  Users,
  HardDrive,
  Gauge,
  Zap,
  Check,
  ArrowUpRight,
  Download,
  FileText,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Crown,
  Building2,
  User,
  Sparkles,
} from 'lucide-react'

// 套餐配置数据
const plans = [
  {
    id: 'community',
    name: '社区版',
    nameEn: 'Community',
    icon: User,
    price: 0,
    priceUnit: '免费',
    badge: null,
    features: ['基础模型路由', '10 名活跃用户', '1 GB 知识库存储', '10K Token/月', '社区支持'],
    limits: { users: 10, storage: '1 GB', tokens: '10K/月', qps: 10 },
  },
  {
    id: 'professional',
    name: '专业版',
    nameEn: 'Professional',
    icon: Zap,
    price: 2800,
    priceUnit: '/ 年',
    badge: '推荐',
    features: ['全模型路由', '100 名活跃用户', '20 GB 知识库存储', '1M Token/月', '邮件支持', 'API 密钥管理'],
    limits: { users: 100, storage: '20 GB', tokens: '1M/月', qps: 50 },
  },
  {
    id: 'enterprise',
    name: '企业版',
    nameEn: 'Enterprise Pro',
    icon: Building2,
    price: 8800,
    priceUnit: '/ 年',
    badge: '当前方案',
    features: [
      '全模型路由 + MCP 网关',
      '1,000 名活跃用户',
      '50 GB 知识库存储',
      '10M Token/月',
      '专属技术支持',
      '180 天审计日志',
      'SSO 集成',
    ],
    limits: { users: 1000, storage: '50 GB', tokens: '10M/月', qps: 100 },
  },
  {
    id: 'private',
    name: '集团私有化版',
    nameEn: 'Enterprise Private',
    icon: Crown,
    price: null,
    priceUnit: '联系销售',
    badge: null,
    features: [
      '私有化部署',
      '无限活跃用户',
      '无限知识库存储',
      '无限 Token',
      '7x24 专属支持',
      '365 天审计日志',
      '定制化开发',
    ],
    limits: { users: '无限', storage: '无限', tokens: '无限', qps: 500 },
  },
]

// 历史账单数据
const billingHistory = [
  { id: 'INV-2026-005', date: '2026-05-18', amount: 8800, status: 'paid', plan: '企业专业版', period: '2026.05 - 2027.05' },
  { id: 'INV-2025-004', date: '2025-05-18', amount: 8800, status: 'paid', plan: '企业专业版', period: '2025.05 - 2026.05' },
  { id: 'INV-2024-003', date: '2024-05-18', amount: 6800, status: 'paid', plan: '企业专业版', period: '2024.05 - 2025.05' },
  { id: 'INV-2024-002', date: '2024-01-15', amount: 2800, status: 'paid', plan: '专业版', period: '2024.01 - 2024.05' },
  { id: 'INV-2023-001', date: '2023-06-01', amount: 0, status: 'free', plan: '社区版', period: '2023.06 - 2024.01' },
]

// 用量数据
const usageData = {
  tokens: { used: 6500000, total: 10000000, unit: 'Token' },
  storage: { used: 34, total: 50, unit: 'GB' },
  users: { used: 125, total: 1000, unit: '人' },
}

function ProgressBar({ used, total }: { used: number; total: number }) {
  const percentage = Math.min((used / total) * 100, 100)
  const isWarning = percentage >= 70
  const isDanger = percentage >= 90

  return (
    <div className="w-full h-2 rounded-full bg-[var(--border-color)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${percentage}%`,
          backgroundColor: isDanger
            ? 'var(--brand-accent)'
            : isWarning
            ? 'var(--brand-accent)'
            : 'var(--brand-main)',
        }}
      />
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

export default function Subscription() {
  const [selectedPlan, setSelectedPlan] = useState('enterprise')

  const daysUntilExpiry = 365

  return (
    <div>
      <PageHeader
        title="套餐与计费"
        subtitle="监控企业套餐方案，查看调用成本、到期情况与用量水位。"
        breadcrumbs={[{ label: '组织治理' }, { label: '套餐与计费' }]}
        actions={
          <Button>
            <ArrowUpRight size={16} className="mr-2" />
            升级套餐方案
          </Button>
        }
      />

      <div className="space-y-6">
        {/* 顶部：当前套餐 + 到期倒计时 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 当前套餐方案 */}
          <Card
            className="lg:col-span-2 flex flex-col justify-between"
            style={{ borderLeft: '4px solid var(--brand-main)' }}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Badge variant="success" size="md">
                    企业专业版 (Enterprise Pro)
                  </Badge>
                  <h2 className="text-2xl font-bold mt-2">北京研发中心专享方案</h2>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-brand-main">
                    ¥ 8,800 <span className="text-xs text-secondary font-normal">/ 年</span>
                  </div>
                  <div className="text-xs text-secondary mt-1">下次账单日: 2027-05-18</div>
                </div>
              </div>
              <p className="text-secondary text-sm">
                提供全场景 model 路由管控，最高支持 1,000 名活跃用户，专属 MCP 私有工具网关与
                180 天请求审计。
              </p>
            </div>

            <div
              className="border-t pt-4 mt-6 grid grid-cols-3 gap-4"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start gap-3">
                <Users size={18} className="text-brand-main mt-0.5" />
                <div>
                  <div className="text-secondary text-xs">可用用户数</div>
                  <div className="text-lg font-bold mt-1">125 / 1,000</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HardDrive size={18} className="text-brand-main mt-0.5" />
                <div>
                  <div className="text-secondary text-xs">私有知识库</div>
                  <div className="text-lg font-bold mt-1">3.4 GB / 50 GB</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Gauge size={18} className="text-brand-main mt-0.5" />
                <div>
                  <div className="text-secondary text-xs">并发限速 (QPS)</div>
                  <div className="text-lg font-bold mt-1">100 QPS</div>
                </div>
              </div>
            </div>
          </Card>

          {/* 服务到期倒计时 */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="text-base">服务到期倒计时</CardTitle>
                <Clock size={18} className="text-brand-accent" />
              </CardHeader>
              <div className="text-4xl font-black text-brand-accent mt-2">
                {daysUntilExpiry} <span className="text-lg font-normal text-secondary">天</span>
              </div>
              <p className="text-xs text-secondary mt-2">
                您的企业专业版套餐方案今天已成功完成年度续费，有效期至 2027 年 5 月 18 日。
              </p>
            </div>
            <Button variant="secondary" className="w-full text-sm py-2 mt-4">
              <CreditCard size={16} className="mr-2" />
              查看历史账单
            </Button>
          </Card>
        </div>

        {/* 用量进度 */}
        <Card>
          <CardHeader>
            <CardTitle>用量监控</CardTitle>
            <TrendingUp size={18} className="text-brand-main" />
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Token 用量 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-brand-main" />
                  <span className="text-sm font-medium">Token 调用量</span>
                </div>
                <span className="text-xs text-secondary">
                  {formatNumber(usageData.tokens.used)} / {formatNumber(usageData.tokens.total)}
                </span>
              </div>
              <ProgressBar used={usageData.tokens.used} total={usageData.tokens.total} />
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>本月已用 {((usageData.tokens.used / usageData.tokens.total) * 100).toFixed(1)}%</span>
                <Badge variant="warning" size="sm">70% 预警线</Badge>
              </div>
            </div>

            {/* 知识库存储 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive size={16} className="text-brand-main" />
                  <span className="text-sm font-medium">知识库存储</span>
                </div>
                <span className="text-xs text-secondary">
                  {usageData.storage.used} GB / {usageData.storage.total} GB
                </span>
              </div>
              <ProgressBar used={usageData.storage.used} total={usageData.storage.total} />
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>已用 {((usageData.storage.used / usageData.storage.total) * 100).toFixed(1)}%</span>
                <Badge variant="success" size="sm">健康</Badge>
              </div>
            </div>

            {/* 活跃用户 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-brand-main" />
                  <span className="text-sm font-medium">活跃用户</span>
                </div>
                <span className="text-xs text-secondary">
                  {usageData.users.used} / {usageData.users.total}
                </span>
              </div>
              <ProgressBar used={usageData.users.used} total={usageData.users.total} />
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>本月活跃 {((usageData.users.used / usageData.users.total) * 100).toFixed(1)}%</span>
                <Badge variant="success" size="sm">健康</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* 到期预警 */}
        {daysUntilExpiry <= 30 && (
          <Card className="border-l-4 border-l-[var(--brand-accent)]">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 15%, transparent)' }}>
                <AlertTriangle size={24} className="text-brand-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">套餐即将到期</h3>
                <p className="text-sm text-secondary mt-1">
                  您的企业专业版套餐将在 {daysUntilExpiry} 天后到期。到期后将自动降级为社区版，部分功能将受限。
                </p>
                <div className="flex gap-3 mt-3">
                  <Button size="sm">立即续费</Button>
                  <Button variant="secondary" size="sm">了解更多</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 套餐对比 */}
        <Card>
          <CardHeader>
            <CardTitle>套餐方案对比</CardTitle>
            <Sparkles size={18} className="text-brand-main" />
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const Icon = plan.icon
              const isCurrent = plan.id === 'enterprise'
              const isSelected = selectedPlan === plan.id

              return (
                <div
                  key={plan.id}
                  className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-[var(--brand-main)] bg-[color-mix(in_srgb,var(--brand-main)_5%,transparent)]'
                      : isSelected
                      ? 'border-[var(--brand-main)]'
                      : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.badge && (
                    <div className="absolute -top-2 left-4">
                      <Badge variant={plan.badge === '当前方案' ? 'success' : 'info'} size="sm">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: isCurrent
                          ? 'var(--brand-main)'
                          : 'var(--border-color)',
                      }}
                    >
                      <Icon size={20} className={isCurrent ? 'text-white' : 'text-secondary'} />
                    </div>
                    <div>
                      <div className="font-semibold">{plan.name}</div>
                      <div className="text-xs text-secondary">{plan.nameEn}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    {plan.price !== null ? (
                      <div className="text-2xl font-black">
                        ¥ {plan.price.toLocaleString()}
                        <span className="text-xs text-secondary font-normal">{plan.priceUnit}</span>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-brand-main">{plan.priceUnit}</div>
                    )}
                  </div>

                  <ul className="space-y-2 mb-4">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check size={14} className="text-brand-main mt-0.5 shrink-0" />
                        <span className="text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isCurrent ? 'secondary' : 'primary'}
                    className="w-full"
                    size="sm"
                    disabled={isCurrent}
                  >
                    {isCurrent ? '当前方案' : plan.id === 'private' ? '联系销售' : '升级方案'}
                  </Button>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 历史账单 */}
        <Card>
          <CardHeader>
            <CardTitle>历史账单</CardTitle>
            <Button variant="secondary" size="sm">
              <Download size={14} className="mr-2" />
              导出全部
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-left py-3 px-4 font-medium text-secondary">账单编号</th>
                  <th className="text-left py-3 px-4 font-medium text-secondary">日期</th>
                  <th className="text-left py-3 px-4 font-medium text-secondary">套餐</th>
                  <th className="text-left py-3 px-4 font-medium text-secondary">服务周期</th>
                  <th className="text-right py-3 px-4 font-medium text-secondary">金额</th>
                  <th className="text-center py-3 px-4 font-medium text-secondary">状态</th>
                  <th className="text-right py-3 px-4 font-medium text-secondary">操作</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((bill) => (
                  <tr
                    key={bill.id}
                    className="border-b hover:bg-[color-mix(in_srgb,var(--brand-main)_5%,transparent)]"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Receipt size={14} className="text-secondary" />
                        <span className="font-mono text-xs">{bill.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-secondary">{bill.date}</td>
                    <td className="py-3 px-4">{bill.plan}</td>
                    <td className="py-3 px-4 text-secondary">{bill.period}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {bill.amount === 0 ? (
                        <span className="text-secondary">免费</span>
                      ) : (
                        `¥ ${bill.amount.toLocaleString()}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={bill.status === 'paid' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {bill.status === 'paid' ? '已支付' : '免费'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="secondary" size="sm">
                        <FileText size={14} className="mr-1" />
                        发票
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 底部操作区 */}
        <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-sm text-secondary">
            需要调整套餐方案？请联系您的专属客户经理或拨打 400-888-8888
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">
              <FileText size={16} className="mr-2" />
              下载合同
            </Button>
            <Button>
              <ArrowUpRight size={16} className="mr-2" />
              升级套餐
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
