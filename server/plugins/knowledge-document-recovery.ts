import { startKnowledgeDocumentWorker } from '#server/utils/knowledge-jobs'
import { recoverInterruptedDocuments } from '#server/utils/knowledge-rag'

export default defineNitroPlugin(async () => {
  try {
    await startKnowledgeDocumentWorker()
    await recoverInterruptedDocuments()
  }
  catch {}
})
