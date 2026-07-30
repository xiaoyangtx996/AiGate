import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization, quotaChangeLog, quotaRequest } from '@/db/schema'

interface DbClient {
  select: typeof db.select
  update: typeof db.update
  delete: typeof db.delete
}

export interface QuotaNode {
  id: string
  parentId?: string | null
  tokenLimit: number
  tokenUsed?: number
}

export interface QuotaChange {
  organizationId: string
  nextTokenLimit: number
}

export interface QuotaRequestDraft {
  organizationId: string
  requestedTokenLimit: number
  reason?: string
  requesterId: string
}

export interface QuotaApprovalDecision {
  requestId: string
  status: 'approved' | 'rejected'
  approverId: string
  comment?: string
}

export function createQuotaRequest(draft: QuotaRequestDraft) {
  if (!draft.organizationId) return { valid: false, reason: '缺少组织' }
  if (!draft.requesterId) return { valid: false, reason: '缺少申请人' }
  if (!Number.isInteger(draft.requestedTokenLimit) || draft.requestedTokenLimit < 0)
    return { valid: false, reason: '申请配额必须是非负整数' }

  return {
    valid: true,
    request: {
      ...draft,
      status: 'pending' as const,
      createdAt: new Date(),
    },
  }
}

export function decideQuotaRequest(decision: QuotaApprovalDecision) {
  if (!decision.requestId) return { valid: false, reason: '缺少申请记录' }
  if (!decision.approverId) return { valid: false, reason: '缺少审批人' }

  return {
    valid: true,
    decision: {
      ...decision,
      decidedAt: new Date(),
    },
  }
}

export function validateQuotaConservation(nodes: QuotaNode[], changes: QuotaChange[] = []) {
  const changeMap = new Map(changes.map(change => [change.organizationId, change.nextTokenLimit]))
  const nodeMap = new Map(nodes.map(node => [node.id, node]))
  const childMap = new Map<string, QuotaNode[]>()

  for (const node of nodes) {
    if (!node.parentId) continue

    const list = childMap.get(node.parentId) ?? []
    list.push(node)
    childMap.set(node.parentId, list)
  }

  for (const node of nodes) {
    const nextLimit = changeMap.get(node.id) ?? node.tokenLimit
    const used = node.tokenUsed ?? 0

    if (nextLimit < 0) {
      return {
        valid: false,
        reason: '配额不能小于 0',
        organizationId: node.id,
      }
    }

    if (nextLimit > 0 && used > nextLimit) {
      return {
        valid: false,
        reason: '配额不能小于已使用量',
        organizationId: node.id,
      }
    }

    const parent = node.parentId ? nodeMap.get(node.parentId) : null
    const parentLimit = parent ? (changeMap.get(parent.id) ?? parent.tokenLimit) : 0
    if (parent && parentLimit > 0 && nextLimit > parentLimit) {
      return {
        valid: false,
        reason: '子级配额不能超过父级配额',
        organizationId: node.id,
      }
    }
  }

  for (const node of nodes) {
    const nextLimit = changeMap.get(node.id) ?? node.tokenLimit
    const children = childMap.get(node.id) ?? []
    const childTotal = children.reduce((sum, child) => sum + (changeMap.get(child.id) ?? child.tokenLimit), 0)
    if (nextLimit > 0 && childTotal > nextLimit) {
      return {
        valid: false,
        reason: '子级配额总和不能超过父级配额',
        organizationId: node.id,
      }
    }
  }

  return { valid: true }
}

export async function createOrganizationQuotaRequest(draft: QuotaRequestDraft) {
  const validation = createQuotaRequest(draft)
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.reason })
  }

  const [org] = await db.select().from(organization).where(eq(organization.id, draft.organizationId))
  if (!org) {
    throw createError({ statusCode: 404, statusMessage: '组织不存在' })
  }

  const values = {
    organizationId: draft.organizationId,
    requesterId: draft.requesterId,
    requestedTokenLimit: draft.requestedTokenLimit,
    currentTokenLimit: org.tokenLimit,
  }
  const [created] = await db
    .insert(quotaRequest)
    .values(draft.reason ? { ...values, reason: draft.reason } : values)
    .returning()

  return created
}

export async function decideOrganizationQuotaRequest(decision: QuotaApprovalDecision) {
  const validation = decideQuotaRequest(decision)
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.reason })
  }

  const [request] = await db.select().from(quotaRequest).where(eq(quotaRequest.id, decision.requestId))
  if (!request) {
    throw createError({ statusCode: 404, statusMessage: '配额申请不存在' })
  }
  if (request.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: '配额申请已处理' })
  }

  const previousTokenLimit = request.currentTokenLimit
  let nextTokenLimit = request.currentTokenLimit

  if (decision.status === 'approved') {
    const orgs = await db.select().from(organization)
    const conservation = validateQuotaConservation(orgs, [
      {
        organizationId: request.organizationId,
        nextTokenLimit: request.requestedTokenLimit,
      },
    ])

    if (!conservation.valid) {
      throw createError({ statusCode: 400, statusMessage: conservation.reason })
    }

    await db
      .update(organization)
      .set({ tokenLimit: request.requestedTokenLimit })
      .where(eq(organization.id, request.organizationId))

    nextTokenLimit = request.requestedTokenLimit
  }

  const logValues = {
    organizationId: request.organizationId,
    requestId: request.id,
    actorId: decision.approverId,
    previousTokenLimit,
    nextTokenLimit,
    decisionStatus: decision.status,
  }
  const reason = decision.comment ?? request.reason
  await db.insert(quotaChangeLog).values(reason ? { ...logValues, reason } : logValues)

  const updateValues = {
    status: decision.status,
    approverId: decision.approverId,
    decidedAt: new Date(),
  }
  const [updated] = await db
    .update(quotaRequest)
    .set(decision.comment ? { ...updateValues, decisionComment: decision.comment } : updateValues)
    .where(eq(quotaRequest.id, decision.requestId))
    .returning()

  return updated
}

export async function checkQuota(organizationId: string, requestedTokens: number) {
  const [org] = await db.select().from(organization).where(eq(organization.id, organizationId))
  if (!org) return { allowed: false, reason: '组织不存在' }
  if (org.tokenLimit <= 0) return { allowed: true, remaining: Infinity }
  const remaining = org.tokenLimit - org.tokenUsed
  if (remaining <= 0) return { allowed: false, reason: '配额已用尽', remaining: 0 }
  if (requestedTokens > remaining) return { allowed: false, reason: `配额不足，剩余 ${remaining} tokens`, remaining }
  return { allowed: true, remaining }
}

export async function consumeQuota(organizationId: string, tokens: number, cost = 0) {
  await db
    .update(organization)
    .set({
      tokenUsed: sql`${organization.tokenUsed} + ${tokens}`,
      costUsed: sql`${organization.costUsed} + ${cost}`,
    })
    .where(eq(organization.id, organizationId))
}

function buildOrganizationChildren(orgs: Array<typeof organization.$inferSelect>) {
  const children = new Map<string, Array<typeof organization.$inferSelect>>()
  for (const org of orgs) {
    if (!org.parentId)
      continue
    const list = children.get(org.parentId) ?? []
    list.push(org)
    children.set(org.parentId, list)
  }
  return children
}

function collectSubtreePostOrder(
  root: typeof organization.$inferSelect,
  children: Map<string, Array<typeof organization.$inferSelect>>,
  result: Array<typeof organization.$inferSelect> = [],
) {
  for (const child of children.get(root.id) ?? []) {
    collectSubtreePostOrder(child, children, result)
  }
  result.push(root)
  return result
}

export async function deleteOrganizationReturningQuota(organizationId: string) {
  return db.transaction(async (tx: DbClient) => {
    const orgs = await tx.select().from(organization)
    const target = orgs.find(org => org.id === organizationId)
    if (!target) {
      throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
    }

    const children = buildOrganizationChildren(orgs)
    const deletionOrder = collectSubtreePostOrder(target, children)
    for (const org of deletionOrder) {
      if (org.parentId && org.tokenLimit > 0) {
        await tx
          .update(organization)
          .set({ tokenLimit: sql`${organization.tokenLimit} + ${org.tokenLimit}` })
          .where(eq(organization.id, org.parentId))
      }
      await tx.delete(organization).where(eq(organization.id, org.id))
    }

    return target
  })
}

export async function moveOrganizationParentQuota(
  tx: DbClient,
  current: typeof organization.$inferSelect,
  nextParentId: string | null | undefined,
) {
  if (nextParentId === undefined || nextParentId === current.parentId)
    return
  if (nextParentId === current.id) {
    throw createError({ statusCode: 400, statusMessage: '组织不能迁移到自身下级' })
  }

  if (current.parentId && current.tokenLimit > 0) {
    await tx
      .update(organization)
      .set({ tokenLimit: sql`${organization.tokenLimit} + ${current.tokenLimit}` })
      .where(eq(organization.id, current.parentId))
  }

  if (nextParentId && current.tokenLimit > 0) {
    await tx
      .update(organization)
      .set({ tokenLimit: sql`${organization.tokenLimit} - ${current.tokenLimit}` })
      .where(eq(organization.id, nextParentId))
  }
}

export async function getQuotaStatus(organizationId: string) {
  const [org] = await db.select().from(organization).where(eq(organization.id, organizationId))
  if (!org) return null
  const usagePercent = org.tokenLimit > 0 ? Math.round((org.tokenUsed / org.tokenLimit) * 100) : 0
  return {
    organizationId: org.id,
    organizationName: org.name,
    tokenLimit: org.tokenLimit,
    tokenUsed: org.tokenUsed,
    remaining: Math.max(0, org.tokenLimit - org.tokenUsed),
    usagePercent,
    isWarning: usagePercent >= 90,
    isCritical: usagePercent >= 95,
  }
}
