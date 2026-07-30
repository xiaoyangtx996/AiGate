import { and, asc, desc, eq } from 'drizzle-orm'
import { AIGATE_BOT_ID } from '#server/utils/aigate-bot'
import { db } from '@/db/drizzle'
import { conversation, conversationMessage } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId)
      return responseError(null, 'Unauthorized', { statusCode: 401 })

    const rows = await db
      .select()
      .from(conversation)
      .where(and(eq(conversation.userId, principal.userId), eq(conversation.type, 'bot')))
      .orderBy(desc(conversation.updatedAt))
      .limit(20)

    const items = await Promise.all(
      rows.map(async (item) => {
        const messages = await db
          .select()
          .from(conversationMessage)
          .where(eq(conversationMessage.conversationId, item.id))
          .orderBy(asc(conversationMessage.createdAt))
          .limit(20)

        const lastMessage = messages.at(-1)
        return {
          id: item.id,
          agentId: AIGATE_BOT_ID,
          title: item.title || 'AiGate Bot',
          lastMessage: lastMessage?.content || '',
          updatedAt: item.updatedAt,
          messages: messages.map(message => ({
            role: message.role,
            content: message.content,
            time: message.createdAt,
            toolSteps: (message.metadata as { toolSteps?: unknown[] } | null)?.toolSteps || [],
          })),
        }
      }),
    )

    return responseSuccess(items)
  }
  catch (err) {
    return responseError(err)
  }
})
