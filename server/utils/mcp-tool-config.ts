const defaultAllowedMcpCommands = ['uvx', 'npx', 'node', 'python', 'python3']
const shellSpecialChars = /[;|&$<>`]/

function getAllowedMcpCommands() {
  return (process.env.ALLOWED_MCP_COMMANDS || defaultAllowedMcpCommands.join(','))
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function assertSafeStdioConfig(command: string | null | undefined, args: string[]) {
  if (!command) {
    throw createError({ statusCode: 400, statusMessage: 'stdio MCP 工具必须配置 command' })
  }

  if (!getAllowedMcpCommands().includes(command)) {
    throw createError({ statusCode: 400, statusMessage: 'MCP stdio command 不在白名单内' })
  }

  const unsafeArg = args.find(arg => shellSpecialChars.test(arg))
  if (unsafeArg) {
    throw createError({ statusCode: 400, statusMessage: `MCP stdio args 包含不安全字符: ${unsafeArg}` })
  }
}

export function normalizeMcpToolPayload(body: Record<string, any>) {
  const transportType = body.transportType || body.type || 'sse'
  const serverUrl = body.serverUrl || body.endpoint || body.config?.endpoint || null
  const command = body.command || (transportType === 'stdio' ? body.endpoint?.split(' ')[0] : null)
  const args = Array.isArray(body.args) ? body.args.map(String) : []
  if (transportType === 'stdio') {
    assertSafeStdioConfig(command, args)
  }

  return {
    ...body,
    type: body.type || transportType,
    transportType,
    serverUrl: transportType === 'stdio' ? null : serverUrl,
    command,
    args,
    env: body.env || {},
    authType: body.authType || 'none',
    authConfig: body.authConfig || {},
    config: {
      ...(body.config || {}),
      endpoint: serverUrl || body.endpoint,
      command,
      args,
      env: body.env || {},
    },
  }
}

const SECRET_KEY_PATTERN = /(key|token|secret|password|credential|authorization)/i

function maskSecret(value: unknown) {
  if (typeof value !== 'string')
    return '****'

  if (!value)
    return value

  return value.length > 4 ? `****${value.slice(-4)}` : '****'
}

export function redactMcpSecrets(value: unknown, parentKey = ''): unknown {
  if (value === null || value === undefined)
    return value

  if (Array.isArray(value))
    return value.map(item => redactMcpSecrets(item, parentKey))

  if (value instanceof Date)
    return value

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if ((parentKey === 'env' || SECRET_KEY_PATTERN.test(key)) && (typeof item !== 'object' || item === null))
          return [key, maskSecret(item)]

        return [key, redactMcpSecrets(item, key)]
      }),
    )
  }

  if (parentKey === 'env' || SECRET_KEY_PATTERN.test(parentKey))
    return maskSecret(value)

  return value
}

export function toPublicMcpTool<T extends Record<string, any> | null | undefined>(tool: T): T {
  if (!tool)
    return tool

  return {
    ...tool,
    env: redactMcpSecrets(tool.env, 'env'),
    authConfig: redactMcpSecrets(tool.authConfig, 'authConfig'),
    config: redactMcpSecrets(tool.config, 'config'),
    versions: Array.isArray(tool.versions)
      ? tool.versions.map((version: Record<string, any>) => ({
          ...version,
          config: redactMcpSecrets(version.config, 'config'),
        }))
      : tool.versions,
  }
}
