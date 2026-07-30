import { and, asc, eq, inArray, lte, or } from 'drizzle-orm'
import { decryptCredentialIfNeeded } from '#server/utils/credential-crypto'
import { db } from '@/db/drizzle'
import { aiModel, channel, channelCredential } from '@/db/schema'

export interface ChannelPreset {
  id: string
  name: string
  vendor: string
  vendorTag: string
  endpoint: string
  icon: string
  models: string[]
}

export interface ChannelTestResult {
  channelId: string
  credentialId?: string
  credentialName?: string
  healthy: boolean
  status?: number
  latency: number
  error?: string
  models: string[]
  timestamp: string
}

export const channelPresets: ChannelPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    vendor: 'OpenAI',
    vendorTag: 'openai',
    endpoint: 'https://api.openai.com/v1',
    icon: 'simple-icons:openai',
    models: ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-small'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    vendor: 'Anthropic',
    vendorTag: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    icon: 'simple-icons:anthropic',
    models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: 'DeepSeek',
    vendorTag: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1',
    icon: 'lucide:brain-circuit',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    vendor: 'Zhipu',
    vendorTag: 'zhipu',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    icon: 'lucide:sparkles',
    models: ['glm-4-flash', 'glm-4-plus'],
  },
  {
    id: 'moonshot',
    name: 'Kimi / Moonshot',
    vendor: 'Moonshot',
    vendorTag: 'moonshot',
    endpoint: 'https://api.moonshot.cn/v1',
    icon: 'lucide:moon',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    vendor: 'SiliconFlow',
    vendorTag: 'siliconflow',
    endpoint: 'https://api.siliconflow.cn/v1',
    icon: 'lucide:cpu',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'BAAI/bge-m3'],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    vendor: 'Ollama',
    vendorTag: 'ollama',
    endpoint: 'http://localhost:11434/v1',
    icon: 'lucide:server',
    models: ['llama3.1', 'qwen2.5'],
  },
  {
    id: 'custom',
    name: '自定义',
    vendor: 'Custom',
    vendorTag: 'custom',
    endpoint: '',
    icon: 'lucide:plug',
    models: [],
  },
]

const trailingSlashPattern = /\/$/
const leadingSlashPattern = /^\//

export function maskApiKey(apiKey: string) {
  if (!apiKey)
    return ''
  const plaintext = decryptCredentialIfNeeded(apiKey)
  return plaintext.length <= 4 ? '****' : `****${plaintext.slice(-4)}`
}

export function toPublicCredential<T extends { apiKey: string }>(item: T) {
  return { ...item, apiKey: undefined, apiKeyMasked: maskApiKey(item.apiKey) }
}

export function buildUpstreamUrl(endpoint: string, path: string) {
  const base = endpoint.replace(trailingSlashPattern, '')
  const normalizedPath = path.replace(leadingSlashPattern, '')
  if (base.endsWith('/v1') && normalizedPath.startsWith('v1/')) {
    return `${base}/${normalizedPath.slice(3)}`
  }
  return `${base}/${normalizedPath}`
}

export function buildModelsUrl(endpoint: string) {
  return buildUpstreamUrl(endpoint, 'v1/models')
}

export function inferModelType(modelId: string) {
  const id = modelId.toLowerCase()
  if (id.includes('embed') || id.includes('bge'))
    return 'embedding'
  if (id.includes('rerank'))
    return 'rerank'
  if (id.includes('image') || id.includes('dall-e'))
    return 'image'
  if (id.includes('whisper') || id.includes('tts') || id.includes('speech'))
    return 'speech'
  return 'chat'
}

function extractModels(payload: unknown) {
  if (!payload || typeof payload !== 'object')
    return []
  const root = payload as { data?: unknown, models?: unknown }
  const data = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.models)
      ? root.models
      : null
  if (!data)
    return []
  return data
    .map((item) => {
      if (typeof item === 'string')
        return item
      if (item && typeof item === 'object') {
        const row = item as { id?: unknown, name?: unknown, type?: unknown }
        if (typeof row.id === 'string')
          return row.id
        if (typeof row.name === 'string')
          return row.name
        if (row.type === 'model' && typeof row.id === 'string')
          return row.id
      }
      return null
    })
    .filter((item): item is string => Boolean(item))
}

export async function updateCredentialFromStatus(credentialId: string | undefined, status: number, error?: string) {
  if (!credentialId)
    return
  const now = new Date()
  if (status === 401 || status === 403) {
    await db
      .update(channelCredential)
      .set({ status: 'error', lastCheckedAt: now, lastError: error || `HTTP ${status}` })
      .where(eq(channelCredential.id, credentialId))
    return
  }
  if (status === 429) {
    await db
      .update(channelCredential)
      .set({
        status: 'exhausted',
        cooldownUntil: new Date(Date.now() + 5 * 60 * 1000),
        lastCheckedAt: now,
        lastError: error || 'HTTP 429',
      })
      .where(eq(channelCredential.id, credentialId))
    return
  }
  if (status >= 200 && status < 300) {
    await db
      .update(channelCredential)
      .set({ status: 'active', cooldownUntil: null, lastCheckedAt: now, lastError: null })
      .where(eq(channelCredential.id, credentialId))
  }
}

export async function testChannelCredential(
  ch: typeof channel.$inferSelect,
  credential: typeof channelCredential.$inferSelect,
): Promise<ChannelTestResult> {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  if (credential.status === 'disabled') {
    return {
      channelId: ch.id,
      credentialId: credential.id,
      credentialName: credential.name,
      healthy: false,
      latency: 0,
      error: '凭证已停用',
      models: [],
      timestamp,
    }
  }

  try {
    const response = await fetch(buildModelsUrl(ch.endpoint), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${decryptCredentialIfNeeded(credential.apiKey)}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })
    const latency = Date.now() - start
    const text = await response.text()
    let models: string[] = []
    if (response.ok) {
      try {
        models = extractModels(JSON.parse(text))
      }
      catch {}
    }
    const error = response.ok ? undefined : text.slice(0, 500) || `HTTP ${response.status}`
    await updateCredentialFromStatus(credential.id, response.status, error)

    return {
      channelId: ch.id,
      credentialId: credential.id,
      credentialName: credential.name,
      healthy: response.ok,
      status: response.status,
      latency,
      error,
      models,
      timestamp,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await db
      .update(channelCredential)
      .set({ status: 'error', lastCheckedAt: new Date(), lastError: message })
      .where(eq(channelCredential.id, credential.id))
    return {
      channelId: ch.id,
      credentialId: credential.id,
      credentialName: credential.name,
      healthy: false,
      latency: Date.now() - start,
      error: message,
      models: [],
      timestamp,
    }
  }
}

export async function syncChannelModels(ch: typeof channel.$inferSelect, credential?: typeof channelCredential.$inferSelect) {
  const selectedCredential
    = credential
      ?? (
        await db
          .select()
          .from(channelCredential)
          .where(
            and(
              eq(channelCredential.channelId, ch.id),
              or(eq(channelCredential.status, 'active'), lte(channelCredential.cooldownUntil, new Date())),
            ),
          )
          .orderBy(asc(channelCredential.sort), asc(channelCredential.createdAt))
          .limit(1)
      )[0]

  if (!selectedCredential) {
    throw createError({ statusCode: 400, statusMessage: '渠道没有可用凭证' })
  }

  const testResult = await testChannelCredential(ch, selectedCredential)
  if (!testResult.healthy) {
    throw createError({ statusCode: 502, statusMessage: testResult.error || '模型同步失败' })
  }

  const preset = channelPresets.find(item => item.vendorTag === ch.vendorTag)
  const modelNames = testResult.models.length > 0 ? testResult.models : ch.models?.length ? ch.models : preset?.models || []
  let created = 0
  let updated = 0

  for (const modelName of modelNames) {
    const [existing] = await db
      .select()
      .from(aiModel)
      .where(and(eq(aiModel.name, modelName), eq(aiModel.sourceChannelId, ch.id)))
      .limit(1)

    const values = {
      name: modelName,
      provider: ch.vendor,
      type: inferModelType(modelName),
      sourceChannelId: ch.id,
      status: 'available',
      enabled: true,
    }

    if (existing) {
      await db.update(aiModel).set(values).where(eq(aiModel.id, existing.id))
      updated += 1
    }
    else {
      await db.insert(aiModel).values(values)
      created += 1
    }
  }

  await db.update(channel).set({ models: modelNames, health: 'healthy', updatedAt: new Date() }).where(eq(channel.id, ch.id))

  return { created, updated, total: modelNames.length, models: modelNames, test: testResult }
}

export async function updateChannelHealthFromCredentials(channelId: string) {
  const credentials = await db.select().from(channelCredential).where(eq(channelCredential.channelId, channelId))
  const activeCount = credentials.filter(item => item.status === 'active').length
  const health = credentials.length === 0 || activeCount === 0 ? 'down' : activeCount === credentials.length ? 'healthy' : 'degraded'
  await db.update(channel).set({ health, updatedAt: new Date() }).where(eq(channel.id, channelId))
  return health
}

export async function getChannelsByIds(ids: string[]) {
  if (ids.length === 0)
    return []
  return db.select().from(channel).where(inArray(channel.id, ids))
}
