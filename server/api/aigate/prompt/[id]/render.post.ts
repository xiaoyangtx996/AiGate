import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt } from '@/db/schema'

interface PromptVariable {
  name: string
  required?: boolean
  defaultValue?: unknown
}

const PROMPT_VAR_RE = /\{\{\s*([a-z_][\w-]*)\s*\}\}/gi

function normalizeValues(input: unknown) {
  if (typeof input !== 'object' || input === null)
    return {}
  return input as Record<string, unknown>
}

function renderPromptTemplate(content: string, values: Record<string, unknown>) {
  return content.replace(PROMPT_VAR_RE, (_match, name: string) => {
    const value = values[name]
    return value === undefined || value === null ? '' : String(value)
  })
}

function normalizePromptVariables(value: unknown): PromptVariable[] {
  if (!Array.isArray(value))
    return []
  return value
    .map((item) => {
      if (typeof item === 'string')
        return { name: item, required: false }
      if (typeof item === 'object' && item !== null && typeof (item as { name?: unknown }).name === 'string')
        return item as PromptVariable
      return null
    })
    .filter((item): item is PromptVariable => Boolean(item))
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(prompt.id, id!), eq(prompt.organizationId, principal.organizationId))
      : eq(prompt.id, id!)
    const [row] = await db.select().from(prompt).where(where)
    if (!row)
      return responseError(null, 'Prompt not found', { statusCode: 404 })

    const body = await readBody(event)
    const values = normalizeValues(body?.values || body?.variables)
    const declaredVariables = normalizePromptVariables(row.variables)
    const finalValues = { ...values }
    const missing: string[] = []

    for (const variable of declaredVariables) {
      if (!variable?.name)
        continue
      if (finalValues[variable.name] === undefined && variable.defaultValue !== undefined)
        finalValues[variable.name] = variable.defaultValue
      if (variable.required && (finalValues[variable.name] === undefined || finalValues[variable.name] === ''))
        missing.push(variable.name)
    }

    if (missing.length > 0)
      return responseError({ missing }, 'Missing required prompt variables', { statusCode: 400 })

    const rendered = renderPromptTemplate(row.content, finalValues)
    return responseSuccess({
      id: row.id,
      name: row.name,
      content: row.content,
      rendered,
      variables: declaredVariables,
      values: finalValues,
    })
  }
  catch (err) {
    return responseError(err)
  }
})
