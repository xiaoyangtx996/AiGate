import { and, eq, gte, lt, sum } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiLog, billingRecord, organization } from '@/db/schema'

export async function generateBillingForPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) {
    throw new Error('Invalid billing period')
  }
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  const orgs = await db.select().from(organization).where(eq(organization.enabled, true))

  let created = 0
  let updated = 0

  for (const org of orgs) {
    const [result] = await db
      .select({
        totalTokens: sum(apiLog.totalTokens),
        totalCost: sum(apiLog.cost),
      })
      .from(apiLog)
      .where(and(eq(apiLog.organizationId, org.id), gte(apiLog.createdAt, startDate), lt(apiLog.createdAt, endDate)))

    const tokenUsage = Number(result?.totalTokens || 0)
    const cost = Number(result?.totalCost || 0)

    if (tokenUsage === 0 && cost === 0) continue

    const [existing] = await db
      .select()
      .from(billingRecord)
      .where(and(eq(billingRecord.organizationId, org.id), eq(billingRecord.period, period)))

    if (existing) {
      await db.update(billingRecord).set({ tokenUsage, cost }).where(eq(billingRecord.id, existing.id))
      updated++
    } else {
      await db.insert(billingRecord).values({
        organizationId: org.id,
        period,
        tokenUsage,
        cost,
        status: 'pending',
        dueDate: new Date(year, month, 15),
      })
      created++
    }
  }

  return { period, created, updated, totalOrgs: orgs.length }
}

export async function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
