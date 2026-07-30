import { and, eq } from 'drizzle-orm'
import { proxyToChannel, proxyToChannelStream, selectChannel } from '#server/utils/gateway'
import { searchKnowledgeBase } from '#server/utils/knowledge-rag'
import { getSetting } from '#server/utils/system-settings'
import { db } from '@/db/drizzle'
import { aiModel, knowledgeBase } from '@/db/schema'

async function resolveQaModelName(organizationId?: string | null) {
  try {
    const configured = await getSetting<string>('knowledge.qaModelId', organizationId)
    if (configured?.trim()) {
      const [model] = await db.select().from(aiModel).where(eq(aiModel.id, configured.trim())).limit(1)
      if (model?.name)
        return model.name
      return configured.trim()
    }
  }
  catch {}

  const [firstModel] = await db
    .select()
    .from(aiModel)
    .where(and(eq(aiModel.type, 'chat'), eq(aiModel.enabled, true), eq(aiModel.status, 'available')))
    .limit(1)
  return firstModel?.name || 'gpt-4o-mini'
}

function buildQaMessages(query: string, references: Array<{ content?: string | null }>) {
  const context = references.length
    ? references.map((item, index) => `[${index + 1}] ${item.content}`).join('\n\n')
    : '（无可用引用）'
  return [
    {
      role: 'system',
      content: '你是知识库问答助手。请基于给定引用回答，并在回答中标注引用编号如 [1]。若引用不足请明确说明。',
    },
    {
      role: 'user',
      content: `引用：\n${context}\n\n问题：${query}`,
    },
  ]
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const query = String(body?.query || '').trim()
    if (!query)
      return responseError(null, 'query 不能为空', { statusCode: 400 })

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id!))
    if (!kb)
      return responseError(null, '知识库不存在', { statusCode: 404 })
    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    const references = await searchKnowledgeBase(kb, query, Number(body?.topK || kb.topK || 5))
    const modelName = await resolveQaModelName(kb.organizationId)
    const channelConfig = await selectChannel(modelName, kb.organizationId)
    if (!channelConfig)
      return responseError(null, '无可用的问答模型渠道', { statusCode: 503 })

    if (body?.stream) {
      setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      const encoder = new TextEncoder()
      return new ReadableStream({
        async start(controller) {
          const send = (eventName: string, payload: unknown) => {
            controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`))
          }

          send('references', { query, references })
          try {
            const upstream = await proxyToChannelStream(
              channelConfig,
              'v1/chat/completions',
              'POST',
              { 'Content-Type': 'application/json' },
              {
                model: modelName,
                messages: buildQaMessages(query, references),
                stream: true,
                stream_options: { include_usage: true },
              },
            )
            const reader = upstream.body!.getReader()
            const decoder = new TextDecoder()
            let answer = ''
            let lineBuffer = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done)
                break
              lineBuffer += decoder.decode(value, { stream: true })
              const lines = lineBuffer.split('\n')
              lineBuffer = lines.pop() ?? ''
              for (const line of lines) {
                if (!line.startsWith('data: '))
                  continue
                const payload = line.slice(6).trim()
                if (!payload || payload === '[DONE]')
                  continue
                try {
                  const parsed = JSON.parse(payload)
                  const delta = parsed.choices?.[0]?.delta?.content || ''
                  if (delta) {
                    answer += delta
                    send('delta', { content: delta })
                  }
                }
                catch {}
              }
            }

            send('done', { query, answer, references })
            controller.enqueue(encoder.encode('event: done\ndata: [DONE]\n\n'))
          }
          catch (err) {
            send('error', { message: err instanceof Error ? err.message : '问答流式失败' })
          }
          finally {
            controller.close()
          }
        },
      })
    }

    const result = await proxyToChannel(
      channelConfig,
      'v1/chat/completions',
      'POST',
      { 'Content-Type': 'application/json' },
      {
        model: modelName,
        messages: buildQaMessages(query, references),
      },
    )
    if (result.status >= 400)
      return responseError(null, result.body.slice(0, 300), { statusCode: result.status })

    const parsed = JSON.parse(result.body) as { choices?: Array<{ message?: { content?: string } }> }
    const answer = parsed.choices?.[0]?.message?.content
      || (references.length
        ? `已基于 ${references.length} 个知识切片生成参考答案。`
        : '未检索到相关知识切片。')

    return responseSuccess({ query, answer, references })
  }
  catch (err) {
    return responseError(err)
  }
})
