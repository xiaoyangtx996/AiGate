import { inArray } from 'drizzle-orm'
import { PgBoss } from 'pg-boss'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'

export const KNOWLEDGE_DOCUMENT_QUEUE = 'knowledge-document'

interface KnowledgeDocumentJob {
  documentId: string
  reindex?: boolean
}

let bossPromise: Promise<PgBoss> | null = null
let workerPromise: Promise<string> | null = null

async function getBoss() {
  if (!bossPromise) {
    const boss = new PgBoss({
      connectionString: process.env.DATABASE_URL!,
      application_name: 'aigate-knowledge-jobs',
    })
    boss.on('error', error => console.error('[knowledge-jobs]', error))
    bossPromise = boss.start().then(async (instance) => {
      await instance.createQueue(KNOWLEDGE_DOCUMENT_QUEUE, {
        retryLimit: 3,
        retryDelay: 30,
        expireInSeconds: 30 * 60,
        deleteAfterSeconds: 7 * 24 * 60 * 60,
      })
      return instance
    })
  }

  return bossPromise
}

export async function enqueueKnowledgeDocument(documentId: string, options: { reindex?: boolean } = {}) {
  const boss = await getBoss()
  return boss.send(KNOWLEDGE_DOCUMENT_QUEUE, {
    documentId,
    reindex: options.reindex === true,
  } satisfies KnowledgeDocumentJob, {
    retryLimit: 3,
    retryDelay: 30,
    expireInSeconds: 30 * 60,
  })
}

export async function startKnowledgeDocumentWorker() {
  if (!workerPromise) {
    workerPromise = getBoss().then(boss =>
      boss.work<KnowledgeDocumentJob>(KNOWLEDGE_DOCUMENT_QUEUE, {
        batchSize: 1,
        localConcurrency: 2,
        pollingIntervalSeconds: 2,
      }, async (jobs) => {
        const { processDocument } = await import('#server/utils/knowledge-rag')
        for (const job of jobs) {
          if (!job.data?.documentId)
            continue
          await processDocument(job.data.documentId, { reindex: job.data.reindex === true })
        }
      }),
    )
  }

  return workerPromise
}

export async function requeueInterruptedKnowledgeDocuments() {
  const statuses = ['uploaded', 'parsing', 'chunking', 'embedding'] as const
  const rows = await db.select({ id: document.id }).from(document).where(inArray(document.status, [...statuses]))
  if (rows.length === 0)
    return 0

  await db
    .update(document)
    .set({ status: 'uploaded', errorMsg: null, errorMessage: null })
    .where(inArray(document.status, [...statuses]))

  await Promise.all(rows.map(row => enqueueKnowledgeDocument(row.id)))
  return rows.length
}
