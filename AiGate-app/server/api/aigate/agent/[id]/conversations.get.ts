import { getUserConversations } from '#server/utils/agent-chat'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const id = getRouterParam(event, 'id')
    const conversations = await getUserConversations(principal.userId, id)
    return responseSuccess(conversations)
  }
  catch (err) { return responseError(err) }
})
