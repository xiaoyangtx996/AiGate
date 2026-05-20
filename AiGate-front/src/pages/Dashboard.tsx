import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Activity } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const kpiCards = [
  {
    label: '本月 Token 消耗',
    value: '84.2M',
    sub: '预算使用率 64%',
    subColor: 'text-brand-main',
  },
  {
    label: '活跃密钥',
    value: '1,245',
    sub: '17 个密钥将在 7 天内过期',
    subColor: 'text-secondary',
  },
  {
    label: 'MCP 工具调用',
    value: '5.4k',
    sub: 'GitHub / 飞书 / 数据库 Top 3',
    subColor: 'text-brand-main',
  },
  {
    label: 'Agent 对话',
    value: '892',
    accent: true,
    sub: '3 次异常高频调用已拦截',
    subColor: 'text-secondary',
  },
]

const governanceSteps = [
  {
    title: '统一网关代理所有模型调用',
    desc: 'OpenAI / Claude / Gemini / Codex 协议兼容',
  },
  {
    title: '四级组织配额实时扣减',
    desc: '集团 → 分公司 → 部门 → 员工',
  },
  {
    title: '资产层沉淀 MCP 与知识库',
    desc: '按项目 / 部门授权并计量',
  },
  {
    title: 'Agent 调用进入审计链路',
    desc: '知识检索、工具调用、Token 消耗可追踪',
  },
]

const quotaRows = [
  {
    name: '北京研发中心',
    percent: 92,
    accent: true,
    warning: '触发 90% 预警，建议审批临时扩容或限制高成本模型。',
  },
  { name: '华东交付中心', percent: 61, accent: false },
  { name: 'AI 架构部', percent: 48, accent: false },
  { name: '产品创新实验室', percent: 33, accent: false, secondary: true },
]

const riskItems = [
  {
    tag: '配额即将耗尽',
    title: '北京研发中心已消耗 92%',
    desc: '建议 24 小时内处理扩容申请。',
    accent: true,
  },
  {
    tag: '密钥轮换',
    title: '17 个员工 Key 即将过期',
    desc: '涉及 Cursor / Cherry Studio 调用场景。',
    accent: false,
  },
  {
    tag: '资产健康',
    title: '1 个内部 MCP 健康检查失败',
    desc: '邮件发送工具已自动停用。',
    accent: false,
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [period, setPeriod] = useState('本月')

  return (
    <div>
      {/* ============================================================ */}
      {/*  Page Header                                                 */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand-main mb-2">
            AI Governance Command Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            企业 AI 运营驾驶舱
          </h1>
          <p className="text-secondary mt-1">
            统一观察网关流量、组织配额、MCP/知识库资产与 Agent 使用风险。
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="input-base text-xs font-bold"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option>本月</option>
            <option>最近 7 天</option>
            <option>本季度</option>
          </select>
          <button className="btn-secondary">费用分摊</button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Hero Card  --  Cost + Governance                            */}
      {/* ============================================================ */}
      <Card className="mb-6 p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: Cost Summary */}
          <div
            className="p-7 border-r"
            style={{
              borderColor: 'var(--border-color)',
              background:
                'color-mix(in srgb, var(--brand-main) 7%, var(--bg-surface))',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <Badge variant="success">网关正常</Badge>
              <Badge variant="warning">2 个治理风险</Badge>
            </div>
            <div className="text-4xl font-bold mb-3">¥ 128,460</div>
            <p className="text-secondary text-sm mb-6">
              集团本月 AI 成本，已按分公司 / 部门 / 员工完成归集。
            </p>

            <div className="grid grid-cols-3 gap-3.5">
              <MetricBlock label="P99 延迟" value="42ms" />
              <MetricBlock
                label="成功率"
                value="99.92%"
                valueClass="text-brand-main"
              />
              <MetricBlock label="审计留存" value="180天" />
            </div>
          </div>

          {/* Right: Governance Loop */}
          <div className="p-7">
            <h3 className="font-bold mb-4">治理闭环</h3>
            <div className="flex flex-col gap-3.5">
              {governanceSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Badge variant="success">{i + 1}</Badge>
                  <div>
                    <div className="font-bold text-sm">{step.title}</div>
                    <div className="text-secondary text-xs">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  KPI Cards                                                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {kpiCards.map((kpi) => (
            <Card key={kpi.label} className="p-5">
              <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">
                {kpi.label}
              </h3>
              <div
                className={`text-3xl font-bold ${kpi.accent ? 'text-brand-accent' : ''}`}
              >
                {kpi.value}
              </div>
              <div className={`text-xs mt-2 font-bold ${kpi.subColor}`}>
                {kpi.sub}
              </div>
            </Card>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  Charts Row                                                  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Token Trend (2/3) */}
        <Card className="col-span-1 lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-secondary">
              30天 Token 趋势折线图
            </CardTitle>
            <span className="text-xs text-secondary font-mono">
              单位: 百万 (Million Tokens)
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-secondary">
              <div className="text-center">
                <Activity size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">图表加载区域 (ECharts)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Top 5 (1/3) */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-secondary">
              最受欢迎模型 Top 5
            </CardTitle>
            <span className="text-xs text-secondary font-mono">占比一览</span>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-secondary">
              <div className="text-center">
                <BarChart3Placeholder />
                <p className="text-sm mt-2">图表加载区域 (ECharts)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Bottom Row: Quota Water Levels + Risk Alerts                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Cost & Quota (2/3) */}
        <Card className="col-span-1 lg:col-span-2 flex flex-col min-h-[360px]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-secondary">
              组织成本与配额水位
            </CardTitle>
            <a
              href="#/organization"
              className="text-xs text-brand-main font-bold hover:underline"
            >
              进入组织配额
            </a>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-[18px]">
              {quotaRows.map((row) => (
                <div key={row.name}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold">{row.name}</span>
                    <span
                      className={`font-mono ${
                        row.accent
                          ? 'text-brand-accent'
                          : row.secondary
                            ? 'text-secondary'
                            : 'text-brand-main'
                      }`}
                    >
                      {row.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${row.percent}%`,
                        background: row.accent
                          ? 'var(--brand-accent)'
                          : row.secondary
                            ? 'var(--text-secondary)'
                            : 'var(--brand-main)',
                      }}
                    />
                  </div>
                  {row.warning && (
                    <p className="text-secondary text-xs mt-2">
                      {row.warning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Alerts (1/3) */}
        <Card className="col-span-1 flex flex-col min-h-[360px]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-secondary">
              待处理风险
            </CardTitle>
            <a
              href="#/alerts"
              className="text-xs text-brand-main font-bold hover:underline"
            >
              全部预警
            </a>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3.5">
              {riskItems.map((item, i) => (
                <div
                  key={i}
                  className="card p-4"
                  style={
                    item.accent
                      ? {
                          background:
                            'color-mix(in srgb, var(--brand-accent) 8%, var(--bg-surface))',
                        }
                      : undefined
                  }
                >
                  <div
                    className={`text-xs font-bold mb-1 ${item.accent ? 'text-brand-accent' : 'text-brand-main'}`}
                  >
                    {item.tag}
                  </div>
                  <div className="text-sm font-bold">{item.title}</div>
                  <div className="text-secondary text-xs mt-1">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricBlock({
  label,
  value,
  valueClass = '',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <div className="text-secondary text-xs font-bold uppercase tracking-widest">
        {label}
      </div>
      <div className={`text-xl font-bold mt-1 ${valueClass}`}>{value}</div>
    </div>
  )
}

/** Simple placeholder icon for the bar chart area */
function BarChart3Placeholder() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto opacity-40"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}
