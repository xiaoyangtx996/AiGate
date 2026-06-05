import { and, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent, channel, mcpTool, prompt } from '@/db/schema'

type SearchResult = {
  id: string
  name: string
  description?: string | null
  type: string
  url: string
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const keyword = String(query.keyword || '').trim()
    if (keyword.length < 2) {
      return responseSuccess([])
    }

    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const pattern = `%${keyword}%`

    const orgFilter = <T extends { organizationId: typeof agent.organizationId }>(table: T) =>
      principal?.organizationId ? eq(table.organizationId, principal.organizationId) : undefined

    const [agents, prompts, channels, tools] = await Promise.all([
      db.select({ id: agent.id, name: agent.name, description: agent.description })
        .from(agent)
        .where(and(...[orgFilter(agent), ilike(agent.name, pattern)].filter(Boolean)))
        .limit(5),
      db.select({ id: prompt.id, name: prompt.name, description: prompt.description })
        .from(prompt)
        .where(and(...[orgFilter(prompt), ilike(prompt.name, pattern)].filter(Boolean)))
        .limit(5),
      db.select({ id: channel.id, name: channel.name, description: channel.vendor })
        .from(channel)
        .where(and(
          ...[orgFilter(channel), or(ilike(channel.name, pattern), ilike(channel.vendor, pattern))].filter(Boolean),
        ))
        .limit(5),
      db.select({ id: mcpTool.id, name: mcpTool.name, description: mcpTool.description })
        .from(mcpTool)
        .where(and(...[orgFilter(mcpTool), ilike(mcpTool.name, pattern)].filter(Boolean)))
        .limit(5),
    ])

    const formatted: SearchResult[] = [
      ...agents.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        type: 'Agent',
        url: `/aigate/agents/edit/${a.id}`,
      })),
      ...prompts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: 'Prompt',
        url: '/aigate/prompts',
      })),
      ...channels.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: 'Channel',
        url: `/aigate/channels/${c.id}`,
      })),
      ...tools.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: 'MCP Tool',
        url: '/aigate/mcp-tools',
      })),
    ]

    return responseSuccess(formatted)
  }
  catch (err) {
    return responseError(err)
  }
})
