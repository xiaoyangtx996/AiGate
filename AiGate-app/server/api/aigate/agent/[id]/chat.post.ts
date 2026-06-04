import { sendAgentMessage, getUserConversations } from '#server/utils/agent-chat'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing agent ID' })

    const body = await readBody(event)
    if (!body?.message) throw createError({ statusCode: 400, statusMessage: 'Missing message' })

    const result = await sendAgentMessage(id, principal.userId, body.message, body.conversationId)
    return responseSuccess(result)
  }
  catch (err) { return responseError(err) }
})
