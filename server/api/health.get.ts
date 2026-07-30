import { sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'

export default defineEventHandler(async (event) => {
  const mode = getQuery(event).mode
  const timestamp = new Date().toISOString()

  if (mode !== 'ready') {
    return { status: 'ok', timestamp }
  }

  try {
    await db.execute(sql`SELECT 1`)
    const vectorResult = await db.execute(sql`SELECT 1 FROM pg_extension WHERE extname = 'vector'`)
    const rowCount = Array.isArray((vectorResult as any).rows) ? (vectorResult as any).rows.length : 0
    if (rowCount === 0) {
      throw new Error('pgvector extension is not installed')
    }
    return { status: 'ok', mode: 'ready', checks: { database: 'ok', pgvector: 'ok' }, timestamp }
  }
  catch (err) {
    setResponseStatus(event, 503)
    return {
      status: 'error',
      mode: 'ready',
      checks: { database: 'error', pgvector: 'error' },
      error: err instanceof Error ? err.message : 'readiness check failed',
      timestamp,
    }
  }
})
