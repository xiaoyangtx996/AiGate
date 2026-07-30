import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export interface McpEnvField {
  key: string
  label: string
  placeholder: string
  required: boolean
}

export interface McpMarketplacePreset {
  id: string
  slug: string
  name: string
  description: string
  vendor: string
  type: string
  transportType: 'stdio' | 'sse' | 'streamable_http'
  category: string
  icon: string
  endpoint: string
  usage: string
  mcpServers: Record<string, unknown>
  envSchema: McpEnvField[]
}

const placeholderPattern = /^<your-([\w-]+)>$/i

function createPreset(input: Omit<McpMarketplacePreset, 'id' | 'envSchema'>): McpMarketplacePreset {
  return {
    ...input,
    id: input.slug,
    envSchema: deriveEnvSchema(input.mcpServers),
  }
}

export function deriveEnvSchema(config: unknown): McpEnvField[] {
  const fields = new Map<string, McpEnvField>()

  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') {
      if (typeof value === 'string') {
        const match = value.match(placeholderPattern)
        if (match?.[1]) {
          const normalized = match[1].replaceAll('-', '_').toUpperCase()
          fields.set(normalized, {
            key: normalized,
            label: normalized,
            placeholder: value,
            required: true,
          })
        }
      }
      return
    }
    Object.values(value).forEach(visit)
  }

  visit(config)
  return [...fields.values()]
}

function replaceEnvPlaceholders(value: unknown, env: Record<string, string>): unknown {
  if (Array.isArray(value))
    return value.map(item => replaceEnvPlaceholders(item, env))
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') {
      const match = value.match(placeholderPattern)
      if (match?.[1]) {
        return env[match[1].replaceAll('-', '_').toUpperCase()] || value
      }
    }
    return value
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceEnvPlaceholders(item, env)]))
}

export function validatePresetEnv(preset: McpMarketplacePreset, env: Record<string, string>) {
  const missing = preset.envSchema.filter(field => field.required && !env[field.key]?.trim()).map(field => field.key)
  if (missing.length > 0) {
    throw createError({ statusCode: 400, statusMessage: `缺少必填环境变量：${missing.join(', ')}` })
  }
}

export function buildMcpToolFromPreset(
  preset: McpMarketplacePreset,
  env: Record<string, string>,
  organizationId?: string | null,
) {
  validatePresetEnv(preset, env)
  const mcpServers = replaceEnvPlaceholders(preset.mcpServers, env) as Record<string, unknown>
  const serverConfig = Object.values(mcpServers)[0] as Record<string, unknown> | undefined

  return {
    name: preset.name,
    description: preset.description,
    type: preset.transportType,
    organizationId: organizationId ?? null,
    config: {
      vendor: preset.vendor,
      presetId: preset.slug,
      mcpServers,
      endpoint: preset.endpoint,
    },
    transportType: preset.transportType,
    command: typeof serverConfig?.command === 'string' ? serverConfig.command : null,
    args: Array.isArray(serverConfig?.args) ? serverConfig.args as string[] : [],
    env,
    serverUrl: preset.transportType === 'stdio' ? null : preset.endpoint,
    authType: 'none',
    authConfig: {},
    connectionStatus: 'unknown',
    category: preset.category,
    icon: preset.icon,
    sourceSlug: preset.slug,
    status: 'active',
  }
}

export const MCP_MARKETPLACE_PRESETS: McpMarketplacePreset[] = [
  createPreset({
    slug: 'github',
    name: 'GitHub MCP',
    description: '访问 GitHub 仓库、Issues 和 PR。',
    vendor: 'GitHub',
    type: 'sse',
    transportType: 'sse',
    category: '开发工具',
    icon: 'lucide:github',
    endpoint: 'https://api.githubcopilot.com/mcp/',
    usage: '用于仓库检索、Issue 分析、PR 审阅和代码上下文查询。需要 GitHub Token。',
    mcpServers: {
      github: {
        type: 'sse',
        url: 'https://api.githubcopilot.com/mcp/',
        env: { GITHUB_TOKEN: '<your-github-token>' },
      },
    },
  }),
  createPreset({
    slug: 'filesystem',
    name: 'Filesystem MCP',
    description: '本地文件系统读写操作。',
    vendor: 'Anthropic',
    type: 'stdio',
    transportType: 'stdio',
    category: '开发工具',
    icon: 'lucide:folder',
    endpoint: 'npx @modelcontextprotocol/server-filesystem',
    usage: '用于让客户端 MCP server 访问指定目录。服务端仅保存配置，不执行命令。',
    mcpServers: {
      filesystem: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '<your-root-path>'],
        env: {},
      },
    },
  }),
  createPreset({
    slug: 'postgres',
    name: 'PostgreSQL MCP',
    description: '连接 PostgreSQL 数据库并执行只读查询。',
    vendor: 'Community',
    type: 'stdio',
    transportType: 'stdio',
    category: '数据库',
    icon: 'lucide:database',
    endpoint: 'npx @modelcontextprotocol/server-postgres',
    usage: '适合把业务数据库暴露为 MCP 工具。服务端不会执行 stdio 命令，只保存客户端配置。',
    mcpServers: {
      postgres: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-postgres', '<your-postgres-url>'],
        env: {},
      },
    },
  }),
  createPreset({
    slug: 'google-drive',
    name: 'Google Drive MCP',
    description: '访问 Google Drive 文件与目录。',
    vendor: 'Google',
    type: 'sse',
    transportType: 'sse',
    category: '办公协作',
    icon: 'lucide:hard-drive',
    endpoint: 'https://www.googleapis.com/drive/v3/mcp',
    usage: '用于检索和读取团队文档。需要 Google OAuth Access Token。',
    mcpServers: {
      googleDrive: {
        type: 'sse',
        url: 'https://www.googleapis.com/drive/v3/mcp',
        env: { GOOGLE_ACCESS_TOKEN: '<your-google-access-token>' },
      },
    },
  }),
  createPreset({
    slug: 'puppeteer',
    name: 'Puppeteer MCP',
    description: '浏览器自动化、页面截图和网页抓取。',
    vendor: 'Community',
    type: 'stdio',
    transportType: 'stdio',
    category: '浏览器自动化',
    icon: 'lucide:bot',
    endpoint: 'npx @modelcontextprotocol/server-puppeteer',
    usage: '用于网页访问、截图和自动化操作。需要在客户端运行 stdio server。',
    mcpServers: {
      puppeteer: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-puppeteer'],
        env: {},
      },
    },
  }),
  createPreset({
    slug: 'memory',
    name: 'Memory MCP',
    description: '持久化记忆存储。',
    vendor: 'Community',
    type: 'stdio',
    transportType: 'stdio',
    category: '数据集成',
    icon: 'lucide:brain',
    endpoint: 'npx @modelcontextprotocol/server-memory',
    usage: '用于本地客户端维护长期记忆。服务端不执行 stdio。',
    mcpServers: {
      memory: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-memory'],
        env: {},
      },
    },
  }),
  createPreset({
    slug: 'fetch',
    name: 'Fetch MCP',
    description: 'HTTP 请求与网页内容抓取。',
    vendor: 'Community',
    type: 'stdio',
    transportType: 'stdio',
    category: '数据集成',
    icon: 'lucide:download-cloud',
    endpoint: 'npx @modelcontextprotocol/server-fetch',
    usage: '用于客户端执行 HTTP 请求和网页抓取。服务端不执行 stdio。',
    mcpServers: {
      fetch: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-fetch'],
        env: {},
      },
    },
  }),
  createPreset({
    slug: 'git',
    name: 'Git MCP',
    description: 'Git 仓库读取和历史查询。',
    vendor: 'Community',
    type: 'stdio',
    transportType: 'stdio',
    category: '开发工具',
    icon: 'lucide:git-branch',
    endpoint: 'npx @modelcontextprotocol/server-git',
    usage: '用于在客户端读取 Git 仓库状态、提交历史和 diff。',
    mcpServers: {
      git: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-git', '<your-repo-path>'],
        env: {},
      },
    },
  }),
  createPreset({
    slug: 'brave-search',
    name: 'Brave Search MCP',
    description: '通过 Brave Search 提供网页搜索能力。',
    vendor: 'Brave',
    type: 'sse',
    transportType: 'sse',
    category: '数据集成',
    icon: 'lucide:search',
    endpoint: 'https://mcp.brave.com/sse',
    usage: '用于实时网页搜索。安装时需要 Brave API Key。',
    mcpServers: {
      brave: {
        type: 'sse',
        url: 'https://mcp.brave.com/sse',
        env: { BRAVE_API_KEY: '<your-brave-api-key>' },
      },
    },
  }),
  createPreset({
    slug: 'slack',
    name: 'Slack MCP',
    description: '读取 Slack 频道、消息和协作上下文。',
    vendor: 'Slack',
    type: 'sse',
    transportType: 'sse',
    category: '办公协作',
    icon: 'lucide:message-circle',
    endpoint: 'https://slack.com/api/mcp',
    usage: '用于团队知识检索和消息分析。需要 Slack Bot Token。',
    mcpServers: {
      slack: {
        type: 'sse',
        url: 'https://slack.com/api/mcp',
        env: { SLACK_BOT_TOKEN: '<your-slack-bot-token>' },
      },
    },
  }),
]

export function findMcpPreset(slug: string) {
  const normalized = slug.startsWith('preset-') ? slug.slice(7) : slug
  return MCP_MARKETPLACE_PRESETS.find(item => item.slug === normalized || item.id === normalized)
}

export async function installMcpPreset(
  slug: string,
  env: Record<string, string>,
  organizationId?: string | null,
  client: Pick<typeof db, 'insert'> = db,
) {
  const preset = findMcpPreset(slug)
  if (!preset) {
    throw createError({ statusCode: 404, statusMessage: '预设工具不存在' })
  }
  const values = buildMcpToolFromPreset(preset, env, organizationId)
  const [res] = await client.insert(mcpTool).values(values).returning()
  if (!res) {
    throw createError({ statusCode: 500, statusMessage: 'MCP 工具安装失败' })
  }
  return res
}
