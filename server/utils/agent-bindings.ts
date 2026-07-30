import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agentKnowledgeBase, agentMcpTool, agentSkill, knowledgeBase, mcpTool, skill } from '@/db/schema'

export interface AgentScope {
  isAdmin?: boolean
  organizationId?: string | null
}

export interface AgentBindingIds {
  knowledgeBaseIds: string[]
  toolIds: string[]
  skillIds: string[]
}

type BindingWriter = Pick<typeof db, 'delete' | 'insert'>

export function normalizeIdList(value: unknown) {
  if (!Array.isArray(value))
    return []
  return [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))]
}

export function normalizeAgentBindingInput(body: Record<string, unknown>): AgentBindingIds {
  return {
    knowledgeBaseIds: normalizeIdList(body.knowledgeBaseIds ?? body.knowledgeBases),
    toolIds: normalizeIdList(body.toolIds ?? body.tools),
    skillIds: normalizeIdList(body.skillIds ?? body.skills),
  }
}

function scopedOrgCondition(
  column: typeof knowledgeBase.organizationId | typeof mcpTool.organizationId | typeof skill.organizationId,
  scope?: AgentScope,
) {
  if (!scope?.isAdmin && scope?.organizationId)
    return or(eq(column, scope.organizationId), isNull(column))
  return undefined
}

export async function validateAgentBindings(bindings: AgentBindingIds, scope?: AgentScope) {
  if (bindings.knowledgeBaseIds.length > 5)
    throw createError({ statusCode: 400, statusMessage: 'Agent can bind at most 5 knowledge bases' })

  if (bindings.knowledgeBaseIds.length > 0) {
    const orgCondition = scopedOrgCondition(knowledgeBase.organizationId, scope)
    const rows = await db
      .select({ id: knowledgeBase.id })
      .from(knowledgeBase)
      .where(
        orgCondition
          ? and(inArray(knowledgeBase.id, bindings.knowledgeBaseIds), orgCondition)
          : inArray(knowledgeBase.id, bindings.knowledgeBaseIds),
      )
    if (rows.length !== bindings.knowledgeBaseIds.length)
      throw createError({ statusCode: 400, statusMessage: 'Knowledge base binding contains inaccessible item' })
  }

  if (bindings.toolIds.length > 0) {
    const orgCondition = scopedOrgCondition(mcpTool.organizationId, scope)
    const rows = await db
      .select({ id: mcpTool.id })
      .from(mcpTool)
      .where(orgCondition ? and(inArray(mcpTool.id, bindings.toolIds), orgCondition) : inArray(mcpTool.id, bindings.toolIds))
    if (rows.length !== bindings.toolIds.length)
      throw createError({ statusCode: 400, statusMessage: 'MCP tool binding contains inaccessible item' })
  }

  if (bindings.skillIds.length > 0) {
    const orgCondition = scopedOrgCondition(skill.organizationId, scope)
    const rows = await db
      .select({ id: skill.id })
      .from(skill)
      .where(orgCondition ? and(inArray(skill.id, bindings.skillIds), orgCondition) : inArray(skill.id, bindings.skillIds))
    if (rows.length !== bindings.skillIds.length)
      throw createError({ statusCode: 400, statusMessage: 'Skill binding contains inaccessible item' })
  }

  return bindings
}

export async function writeAgentBindings(database: BindingWriter, agentId: string, bindings: AgentBindingIds) {
  await database.delete(agentKnowledgeBase).where(eq(agentKnowledgeBase.agentId, agentId))
  await database.delete(agentMcpTool).where(eq(agentMcpTool.agentId, agentId))
  await database.delete(agentSkill).where(eq(agentSkill.agentId, agentId))

  if (bindings.knowledgeBaseIds.length > 0) {
    await database.insert(agentKnowledgeBase).values(
      bindings.knowledgeBaseIds.map((knowledgeBaseId, sort) => ({ agentId, knowledgeBaseId, sort })),
    )
  }
  if (bindings.toolIds.length > 0) {
    await database.insert(agentMcpTool).values(bindings.toolIds.map((toolId, sort) => ({ agentId, toolId, sort })))
  }
  if (bindings.skillIds.length > 0) {
    await database.insert(agentSkill).values(bindings.skillIds.map((skillId, sort) => ({ agentId, skillId, sort })))
  }
}

export async function loadAgentBindings(agentId: string) {
  const kbLinks = await db
    .select()
    .from(agentKnowledgeBase)
    .where(eq(agentKnowledgeBase.agentId, agentId))
    .orderBy(asc(agentKnowledgeBase.sort))
  const toolLinks = await db
    .select()
    .from(agentMcpTool)
    .where(eq(agentMcpTool.agentId, agentId))
    .orderBy(asc(agentMcpTool.sort))
  const skillLinks = await db
    .select()
    .from(agentSkill)
    .where(eq(agentSkill.agentId, agentId))
    .orderBy(asc(agentSkill.sort))

  const knowledgeBaseIds = kbLinks.map(item => item.knowledgeBaseId)
  const toolIds = toolLinks.map(item => item.toolId)
  const skillIds = skillLinks.map(item => item.skillId)

  const knowledgeBases = knowledgeBaseIds.length > 0
    ? await db.select().from(knowledgeBase).where(inArray(knowledgeBase.id, knowledgeBaseIds))
    : []
  const tools = toolIds.length > 0 ? await db.select().from(mcpTool).where(inArray(mcpTool.id, toolIds)) : []
  const skills = skillIds.length > 0 ? await db.select().from(skill).where(inArray(skill.id, skillIds)) : []

  return {
    knowledgeBaseIds,
    toolIds,
    skillIds,
    knowledgeBases: knowledgeBaseIds.map(id => knowledgeBases.find(item => item.id === id)).filter(Boolean),
    tools: toolIds.map(id => tools.find(item => item.id === id)).filter(Boolean),
    skills: skillIds.map(id => skills.find(item => item.id === id)).filter(Boolean),
  }
}
