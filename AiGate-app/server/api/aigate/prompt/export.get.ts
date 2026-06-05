import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const data = principal?.organizationId
      ? await db.select().from(prompt).where(eq(prompt.organizationId, principal.organizationId))
      : await db.select().from(prompt)
    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseHeader(event, 'Content-Disposition', 'attachment; filename="prompts-export.json"')
    return data.map(p => ({
      name: p.name,
      description: p.description,
      content: p.content,
      category: p.category,
      variables: p.variables,
    }))
  }
  catch (err) { return responseError(err) }
})
