import { lt } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiLog } from '@/db/schema'

const RETENTION_DAYS = 180

export async function cleanupOldApiLogs() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000)
  const deleted = await db.delete(apiLog).where(lt(apiLog.createdAt, cutoff)).returning()
  return { deleted: deleted.length, cutoffDate: cutoff.toISOString() }
}
