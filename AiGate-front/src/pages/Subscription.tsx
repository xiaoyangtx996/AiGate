import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CreditCard, Clock, Users, HardDrive, Gauge } from 'lucide-react'

export default function Subscription() {
  return (
    <div>
      <PageHeader
        title="套餐与计费"
        subtitle="监控企业套餐方案，查看调用成本、到期情况与用量水位。"
        breadcrumbs={[{ label: '组织治理' }, { label: '套餐与计费' }]}
        actions={<Button>升级套餐方案</Button>}
      />

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
              365 <span className="text-lg font-normal text-secondary">天</span>
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
    </div>
  )
}
