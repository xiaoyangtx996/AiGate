import { proxyToChannel, selectChannel } from '#server/utils/gateway'

const EMBEDDING_BATCH_SIZE = 32

export async function embedTextsViaGateway(options: {
  organizationId: string | null
  modelName: string
  texts: string[]
}): Promise<number[][]> {
  if (options.texts.length === 0)
    return []

  const channel = await selectChannel(options.modelName, options.organizationId)
  if (!channel)
    throw new Error('无可用的 embedding 渠道')

  const vectors: number[][] = []
  for (let index = 0; index < options.texts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = options.texts.slice(index, index + EMBEDDING_BATCH_SIZE)
    const result = await proxyToChannel(
      channel,
      'v1/embeddings',
      'POST',
      { 'Content-Type': 'application/json' },
      {
        model: channel.modelName || options.modelName,
        input: batch,
      },
    )
    if (result.status >= 400)
      throw new Error(`Embedding 调用失败: ${result.body.slice(0, 300)}`)

    const parsed = JSON.parse(result.body) as { data?: Array<{ embedding?: number[] }> }
    const batchVectors = (parsed.data || []).map(item => item.embedding).filter(Boolean) as number[][]
    if (batchVectors.length !== batch.length)
      throw new Error('Embedding 返回数量与请求不一致')

    vectors.push(...batchVectors)
  }

  return vectors
}

export async function probeEmbeddingDim(organizationId: string | null, modelName: string) {
  const [vector] = await embedTextsViaGateway({
    organizationId,
    modelName,
    texts: ['probe'],
  })
  if (!vector?.length)
    throw new Error('无法探测 embedding 维度')
  return vector.length
}
