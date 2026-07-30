import { lt } from 'drizzle-orm'
import { getSetting } from '#server/utils/system-settings'
import { db } from '@/db/drizzle'
import { apiLog, logs } from '@/db/schema'

const API_LOG_RETENTION_DAYS = 180
const OPERATION_LOG_RETENTION_DAYS = 365

function cutoffDate(days: number) {
  return new Date(Date.now() - days * 86400000)
}

export async function cleanupOldApiLogs() {
  const retentionDays = await getSetting<number>('retention.apiLogDays').catch(() => API_LOG_RETENTION_DAYS)
  const cutoff = cutoffDate(retentionDays || API_LOG_RETENTION_DAYS)
  const deleted = await db.delete(apiLog).where(lt(apiLog.createdAt, cutoff)).returning()
  return { deleted: deleted.length, cutoffDate: cutoff.toISOString() }
}

export async function cleanupOldOperationLogs() {
  const retentionDays = await getSetting<number>('retention.operationLogDays').catch(() => OPERATION_LOG_RETENTION_DAYS)
  const cutoff = cutoffDate(retentionDays || OPERATION_LOG_RETENTION_DAYS)
  const deleted = await db.delete(logs).where(lt(logs.createdAt, cutoff)).returning()
  return { deleted: deleted.length, cutoffDate: cutoff.toISOString() }
}
