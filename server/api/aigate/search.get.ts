import { and, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent, apiKey, knowledgeBase, mcpTool, organization, prompt, user } from '@/db/schema'

interface SearchItem {
  id: string
  name: string
  description?: string | null
  type: string
  url: string
  title: string
  subtitle?: string | null
  route: string
}

function like(value: string) {
  return `%${value}%`
}

function makeSearchItem(input: Omit<SearchItem, 'title' | 'subtitle' | 'route'>): SearchItem {
  return {
    ...input,
    title: input.name,
    subtitle: input.description,
    route: input.url,
  }
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean, userId?: string, organizationId?: string | null }
      | undefined
    if (!principal?.userId)
      return responseError(null, 'Unauthorized', { statusCode: 401 })

    const query = getQuery(event)
    const keyword = String(query.keyword || query.q || '').trim()
    if (keyword.length < 2)
      return responseSuccess([])
    if (!principal.isAdmin && !principal.organizationId)
      return responseSuccess([])

    const scopedOrg = !principal.isAdmin && principal.organizationId ? principal.organizationId : null
    const scoped = <T extends { organizationId: any }>(table: T) =>
      scopedOrg ? eq(table.organizationId, scopedOrg) : undefined
    const userKeyword = or(ilike(user.name, like(keyword)), ilike(user.email, like(keyword)), ilike(user.username, like(keyword)))

    const [users, orgs, keys, tools, kbs, agents, prompts] = await Promise.all([
      principal.isAdmin
        ? db
            .select({ id: user.id, name: user.name, email: user.email, username: user.username })
            .from(user)
            .where(userKeyword)
            .limit(5)
        : db
            .select({ id: user.id, name: user.name, email: user.email, username: user.username })
            .from(user)
            .where(and(eq(user.id, principal.userId), userKeyword))
            .limit(5),
      db
        .select({ id: organization.id, name: organization.name, level: organization.level })
        .from(organization)
        .where(
          scopedOrg
            ? and(eq(organization.id, scopedOrg), ilike(organization.name, like(keyword)))
            : ilike(organization.name, like(keyword)),
        )
        .limit(5),
      db
        .select({ id: apiKey.id, name: apiKey.name, env: apiKey.env, organizationId: apiKey.organizationId })
        .from(apiKey)
        .where(
          scoped(apiKey)
            ? and(scoped(apiKey), ilike(apiKey.name, like(keyword)))
            : ilike(apiKey.name, like(keyword)),
        )
        .limit(5),
      db
        .select({ id: mcpTool.id, name: mcpTool.name, description: mcpTool.description, organizationId: mcpTool.organizationId })
        .from(mcpTool)
        .where(
          scoped(mcpTool)
            ? and(scoped(mcpTool), or(ilike(mcpTool.name, like(keyword)), ilike(mcpTool.description, like(keyword))))
            : or(ilike(mcpTool.name, like(keyword)), ilike(mcpTool.description, like(keyword))),
        )
        .limit(5),
      db
        .select({
          id: knowledgeBase.id,
          name: knowledgeBase.name,
          description: knowledgeBase.description,
          organizationId: knowledgeBase.organizationId,
        })
        .from(knowledgeBase)
        .where(
          scoped(knowledgeBase)
            ? and(
                scoped(knowledgeBase),
                or(ilike(knowledgeBase.name, like(keyword)), ilike(knowledgeBase.description, like(keyword))),
              )
            : or(ilike(knowledgeBase.name, like(keyword)), ilike(knowledgeBase.description, like(keyword))),
        )
        .limit(5),
      db
        .select({ id: agent.id, name: agent.name, description: agent.description, organizationId: agent.organizationId })
        .from(agent)
        .where(
          scoped(agent)
            ? and(scoped(agent), or(ilike(agent.name, like(keyword)), ilike(agent.description, like(keyword))))
            : or(ilike(agent.name, like(keyword)), ilike(agent.description, like(keyword))),
        )
        .limit(5),
      db
        .select({ id: prompt.id, name: prompt.name, description: prompt.description, organizationId: prompt.organizationId })
        .from(prompt)
        .where(
          scoped(prompt)
            ? and(scoped(prompt), or(ilike(prompt.name, like(keyword)), ilike(prompt.description, like(keyword))))
            : or(ilike(prompt.name, like(keyword)), ilike(prompt.description, like(keyword))),
        )
        .limit(5),
    ])

    const items: SearchItem[] = [
      ...users.map(item => makeSearchItem({
        id: item.id,
        name: item.name || item.email,
        description: item.username || item.email,
        type: 'User',
        url: '/system-settings/user-manage',
      })),
      ...orgs.map(item => makeSearchItem({
        id: item.id,
        name: item.name,
        description: item.level,
        type: 'Organization',
        url: '/aigate/organizations',
      })),
      ...keys.map(item => makeSearchItem({
        id: item.id,
        name: item.name,
        description: item.env,
        type: 'API Key',
        url: '/aigate/api-keys',
      })),
      ...tools.map(item => makeSearchItem({
        id: item.id,
        name: item.name,
        description: item.description,
        type: 'MCP Tool',
        url: `/aigate/mcp-tools/${item.id}`,
      })),
      ...kbs.map(item => makeSearchItem({
        id: item.id,
        name: item.name,
        description: item.description,
        type: 'Knowledge Base',
        url: `/aigate/knowledge-base/${item.id}`,
      })),
      ...agents.map(item => makeSearchItem({
        id: item.id,
        name: item.name,
        description: item.description,
        type: 'Agent',
        url: `/aigate/agents/edit/${item.id}`,
      })),
      ...prompts.map(item => makeSearchItem({
        id: item.id,
        name: item.name,
        description: item.description,
        type: 'Prompt',
        url: '/aigate/prompts',
      })),
    ]

    return responseSuccess(items)
  }
  catch (err) {
    return responseError(err)
  }
})
