import { sendAgentMessage, streamAgentMessage } from '#server/utils/agent-chat'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null, userId?: string } | undefined
    if (!principal?.userId)
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!principal.isAdmin && !principal.organizationId)
      throw createError({ statusCode: 403, statusMessage: '当前账号缺少组织上下文' })

    const id = getRouterParam(event, 'id')
    if (!id)
      throw createError({ statusCode: 400, statusMessage: 'Missing agent ID' })

    const body = await readBody(event)
    if (!body?.message)
      throw createError({ statusCode: 400, statusMessage: 'Missing message' })

    if (body.stream) {
      setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })

      const encoder = new TextEncoder()
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamAgentMessage(id, principal.userId!, body.message, body.conversationId, {
              isAdmin: principal.isAdmin,
              organizationId: principal.organizationId,
            })) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          }
          catch (err) {
            const message = err instanceof Error && err.message ? err.message : 'Stream failed'
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`))
          }
          finally {
            controller.close()
          }
        },
      })
    }

    const result = await sendAgentMessage(id, principal.userId, body.message, body.conversationId, {
      isAdmin: principal.isAdmin,
      organizationId: principal.organizationId,
    })
    return responseSuccess(result)
  }
  catch (err) { return responseError(err) }
})
