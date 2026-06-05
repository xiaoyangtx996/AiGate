import { sendAgentMessage, streamAgentMessage } from '#server/utils/agent-chat'
import { sendStream } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing agent ID' })

    const body = await readBody(event)
    if (!body?.message) throw createError({ statusCode: 400, statusMessage: 'Missing message' })

    if (body.stream) {
      setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      return sendStream(event, async (stream) => {
        try {
          for await (const chunk of streamAgentMessage(id, principal.userId!, body.message, body.conversationId)) {
            await stream.write(`data: ${JSON.stringify(chunk)}\n\n`)
          }
          await stream.write('data: [DONE]\n\n')
        }
        catch (err: any) {
          await stream.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Stream failed' })}\n\n`)
        }
      })
    }

    const result = await sendAgentMessage(id, principal.userId, body.message, body.conversationId)
    return responseSuccess(result)
  }
  catch (err) { return responseError(err) }
})
