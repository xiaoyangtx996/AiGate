import type { CacheConfig } from '@/composables/useRequest'

export interface ApiRecord {
  [key: string]: any
}

export interface ListResponse<T = ApiRecord> {
  items: T[]
  total: number
  page?: number
  pageSize?: number
}

export interface HealthCheckResult {
  channelId?: string
  name?: string
  healthy: boolean
  latency?: number
  status?: number
  error?: string
  timestamp?: string
}

type HealthCheckResponse = HealthCheckResult | HealthCheckListResponse

export interface HealthCheckListResponse {
  total: number
  healthy: number
  unhealthy: number
  results: HealthCheckResult[]
}

interface DashboardResponse {
  overview?: ApiRecord
  trend?: {
    daily?: ApiRecord[]
  }
  modelBreakdown?: ApiRecord[]
  topConsumers?: ApiRecord[]
  statusDistribution?: ApiRecord
  quotaStatus?: ApiRecord[]
}

interface PromptVersion {
  id: string
  version: number
  content: string
  createdAt: string
}

interface ImportResult {
  imported: number
}

interface AgentListItem {
  id: string
  name: string
  description?: string
  model?: string
}

interface ChatConversation {
  id: string
  agentId: string
  title: string
  lastMessage: string
  updatedAt: string
  messages: { role: string, content: string, time: string }[]
}

interface BotToolStep {
  name: string
  input?: unknown
  result?: unknown
  status?: 'called' | 'failed'
  message?: string
  latency?: number
}

interface BotConversation {
  id: string
  agentId: string
  title: string
  lastMessage: string
  updatedAt: string
  messages: Array<{ role: 'user' | 'assistant', content: string, time: string, toolSteps?: BotToolStep[] }>
}

interface BotChatResponse {
  conversationId: string
  message: string
  toolSteps: BotToolStep[]
}

const cacheConfig = {
  list: {
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  stats: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
} satisfies Record<string, CacheConfig>

export function useAigateApi() {
  const { get, post, put, del } = useRequest()

  // Dashboard
  const getDashboard = (params?: Record<string, unknown>) =>
    get<DashboardResponse>('/aigate/dashboard', params, cacheConfig.stats)
  const getMyWorkbench = () => get<ApiRecord>('/aigate/me/workbench', undefined, cacheConfig.stats)
  const getMyApiLogList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/me/api-log', params, cacheConfig.list)
  const getMyApiKeyList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/me/api-key', params, cacheConfig.list)
  const getPasswordState = () => get<{ mustChangePassword: boolean }>('/aigate/me/password-state')
  const forceChangePassword = (body: { newPassword: string }) =>
    post<{ ok: boolean }>('/aigate/me/force-password-change', body)
  const createMyApiKey = (body: unknown) => post('/aigate/me/api-key', body)
  const updateMyApiKey = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/me/api-key/${id}`, body)
  const getQuotaRequests = (params?: Record<string, unknown>) =>
    get<ApiRecord[]>('/aigate/quota/request', params, cacheConfig.list)
  const createQuotaRequest = (body: unknown) => post('/aigate/quota/request', body)
  const decideQuotaRequest = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    post(`/aigate/quota/request/${id}/decision`, body)

  // Organization
  const getOrgList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/organization', params, cacheConfig.list)
  const getOrgTree = () => get<ApiRecord[]>('/aigate/organization/tree', undefined, cacheConfig.list)
  const insertOrg = (body: unknown) => post('/aigate/organization', body)
  const updateOrg = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/organization/${id}`, body)
  const getTenantPackageList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/tenant-package', params, cacheConfig.list)
  const insertTenantPackage = (body: unknown) => post('/aigate/tenant-package', body)
  const updateTenantPackage = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/tenant-package/${id}`, body)
  const delTenantPackage = (id: string) => del(`/aigate/tenant-package/${id}`)
  const getActiveOrganizations = () => get<ApiRecord>('/aigate/active-organizations')
  const switchActiveOrganization = (organizationId: string | null) =>
    post('/aigate/active-organization', { organizationId }, { invalidates: [''] })

  // Member
  const getMemberList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/member', params, cacheConfig.list)
  const insertMember = (body: unknown) => post('/aigate/member', body)
  const delMember = (id: string) => del(`/aigate/member/${id}`)

  // Channel
  const getChannelList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/channel', params, cacheConfig.list)
  const insertChannel = (body: unknown) => post('/aigate/channel', body)
  const updateChannel = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/channel/${id}`, body)
  const delChannel = (id: string) => del(`/aigate/channel/${id}`)
  const checkChannelHealth = (channelId?: string) =>
    post<HealthCheckResponse>('/aigate/channel/health-check', channelId ? { channelId } : {})
  const getChannelPresets = () => get<ApiRecord[]>('/aigate/channel/presets', undefined, cacheConfig.list)
  const getChannelCredentials = (channelId: string) =>
    get<ApiRecord[]>(`/aigate/channel/${channelId}/credentials`, undefined, cacheConfig.list)
  const insertChannelCredential = (channelId: string, body: unknown) =>
    post(`/aigate/channel/${channelId}/credentials`, body)
  const updateChannelCredential = ({ channelId, id, ...body }: { channelId: string, id: string } & Record<string, unknown>) =>
    put(`/aigate/channel/${channelId}/credentials/${id}`, body)
  const delChannelCredential = (channelId: string, id: string) =>
    del(`/aigate/channel/${channelId}/credentials/${id}`)
  const testChannel = (channelId: string, credentialId?: string) =>
    post<ApiRecord>(`/aigate/channel/${channelId}/test`, credentialId ? { credentialId } : {})
  const syncChannelModels = (channelId: string, credentialId?: string) =>
    post<ApiRecord>(`/aigate/channel/${channelId}/sync-models`, credentialId ? { credentialId } : {})

  // Combo
  const getComboList = () => get<ApiRecord[]>('/aigate/combo', undefined, cacheConfig.list)
  const insertCombo = (body: unknown) => post('/aigate/combo', body)
  const updateCombo = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/combo/${id}`, body)
  const delCombo = (id: string) => del(`/aigate/combo/${id}`)

  // API Key
  const getApiKeyList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/api-key', params, cacheConfig.list)
  const getApiKeyDetail = (id: string) => get<ApiRecord>(`/aigate/api-key/${id}`)
  const insertApiKey = (body: unknown) => post('/aigate/api-key', body)
  const updateApiKey = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/api-key/${id}`, body)
  const delApiKey = (id: string) => del(`/aigate/api-key/${id}`)

  // Model
  const getModelList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/model', params, cacheConfig.list)
  const insertModel = (body: unknown) => post('/aigate/model', body)
  const updateModel = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/model/${id}`, body)
  const delModel = (id: string) => del(`/aigate/model/${id}`)

  // MCP Tool
  const getMcpToolList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/mcp-tool', params, cacheConfig.list)
  const getMcpTool = (id: string) => get<ApiRecord>(`/aigate/mcp-tool/${id}`)
  const insertMcpTool = (body: unknown) => post('/aigate/mcp-tool', body)
  const updateMcpTool = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/mcp-tool/${id}`, body)
  const delMcpTool = (id: string) => del(`/aigate/mcp-tool/${id}`)
  const testMcpTool = (body: unknown) => post<ApiRecord>('/aigate/mcp-tool/test', body)
  const createMcpToolVersion = (id: string, body: unknown) =>
    post<ApiRecord>(`/aigate/mcp-tool/${id}/versions`, body)
  const getMcpMarketplace = () => get<ApiRecord[]>('/aigate/mcp-tool/marketplace', undefined, cacheConfig.list)
  const installMcpPreset = (presetId: string) => post('/aigate/mcp-tool/install', { presetId })
  const getMcpMarketplaceDetail = (slug: string) => get<ApiRecord>(`/aigate/mcp-tool/marketplace/${slug}`)
  const installMcpMarketplacePreset = (slug: string, env?: Record<string, string>) =>
    post(`/aigate/mcp-tool/marketplace/${slug}/install`, { env: env || {} })
  const batchInstallMcpMarketplace = (items: Array<{ slug: string, env?: Record<string, string> }>) =>
    post<ApiRecord>('/aigate/mcp-tool/marketplace/batch-install', items)
  const getGatewayOverview = () => get<ApiRecord>('/aigate/gateway', undefined, cacheConfig.stats)

  // Agent
  const getAgentList = (params?: Record<string, unknown>) =>
    get<ListResponse<AgentListItem>>('/aigate/agent', params, cacheConfig.list)
  const getAgent = (id: string) => get<ApiRecord>(`/aigate/agent/${id}`)
  const insertAgent = (body: unknown) => post('/aigate/agent', body)
  const updateAgent = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/agent/${id}`, body)
  const delAgent = (id: string) => del(`/aigate/agent/${id}`)
  const chatWithAgent = (id: string, message: string, conversationId?: string) =>
    post<ApiRecord>(`/aigate/agent/${id}/chat`, { message, conversationId })
  const getAgentConversations = (id: string) => get<ChatConversation[]>(`/aigate/agent/${id}/conversations`)

  // Knowledge Base
  const getKnowledgeBaseList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/knowledge-base', params, cacheConfig.list)
  const getKnowledgeBase = (id: string) => get<ApiRecord>(`/aigate/knowledge-base/${id}`)
  const insertKnowledgeBase = (body: unknown) => post('/aigate/knowledge-base', body)
  const updateKnowledgeBase = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/knowledge-base/${id}`, body)
  const delKnowledgeBase = (id: string) => del(`/aigate/knowledge-base/${id}`)
  const getStorageInstances = () => get<ApiRecord[]>('/aigate/storage-instance', undefined, cacheConfig.list)
  const getKbDocuments = (kbId: string) => get<ApiRecord[]>(`/aigate/knowledge-base/${kbId}/documents`)
  const uploadKbDocument = (kbId: string, body: unknown) => post(`/aigate/knowledge-base/${kbId}/documents`, body)
  const delKbDocument = (kbId: string, docId: string) => del(`/aigate/knowledge-base/${kbId}/documents/${docId}`)
  const retryKbDocument = (kbId: string, docId: string) => post(`/aigate/knowledge-base/${kbId}/documents/${docId}/retry`)
  const getKbChunks = (kbId: string, params?: Record<string, unknown>) =>
    get<ListResponse>(`/aigate/knowledge-base/${kbId}/chunks`, params, cacheConfig.list)
  const searchKnowledgeBase = (kbId: string, body: unknown) =>
    post<{ query: string, hits: ApiRecord[] }>(`/aigate/knowledge-base/${kbId}/search`, body)
  const qaKnowledgeBase = (kbId: string, body: unknown) => post<ApiRecord>(`/aigate/knowledge-base/${kbId}/qa`, body)
  const rebuildKbVectors = (kbId: string) => post<{ total: number }>(`/aigate/knowledge-base/${kbId}/rebuild-vectors`)

  // Skill
  const getSkillList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/skill', params, cacheConfig.list)
  const getSkill = (id: string) => get<ApiRecord>(`/aigate/skill/${id}`)
  const insertSkill = (body: unknown) => post('/aigate/skill', body)
  const updateSkill = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/skill/${id}`, body)
  const delSkill = (id: string) => del(`/aigate/skill/${id}`)
  const importSkill = (body: unknown) => post<ApiRecord>('/aigate/skill/import', body)
  const getSkillFiles = (id: string) => get<ApiRecord[]>(`/aigate/skill/${id}/files`)
  const insertSkillFile = (id: string, body: unknown) => post(`/aigate/skill/${id}/files`, body)
  const updateSkillFile = ({ id, fileId, ...body }: { id: string, fileId: string } & Record<string, unknown>) =>
    put(`/aigate/skill/${id}/files/${fileId}`, body)
  const delSkillFile = (id: string, fileId: string) => del(`/aigate/skill/${id}/files/${fileId}`)

  // Prompt
  const getPromptList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/prompt', params, cacheConfig.list)
  const insertPrompt = (body: unknown) => post('/aigate/prompt', body)
  const updatePrompt = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/prompt/${id}`, body)
  const delPrompt = (id: string) => del(`/aigate/prompt/${id}`)
  const getPromptVersions = (id: string) => get<PromptVersion[]>(`/aigate/prompt/${id}/versions`)
  const restorePromptVersion = (id: string, versionId: string) =>
    post(`/aigate/prompt/${id}/versions/${versionId}/restore`)
  const renderPrompt = (id: string, body: unknown) => post<ApiRecord>(`/aigate/prompt/${id}/render`, body)
  const runPrompt = (id: string, body: unknown) => post<ApiRecord>(`/aigate/prompt/${id}/run`, body)
  const exportPrompts = () => get<ApiRecord[]>('/aigate/prompt/export')
  const importPrompts = (body: unknown) => post<ImportResult>('/aigate/prompt/import', body)

  // Alert
  const getAlertList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/alert', params, cacheConfig.list)
  const markAlertRead = (id: string) => put(`/aigate/alert/${id}`)
  const updateAlertStatus = (id: string, status: 'open' | 'acknowledged' | 'resolved') =>
    put(`/aigate/alert/${id}`, { status })
  const delAlert = (id: string) => del(`/aigate/alert/${id}`)
  const runAlertCheck = () => post('/aigate/alert/check')
  const getAlertRules = () => get<ListResponse>('/aigate/alert/rule', undefined, cacheConfig.list)
  const insertAlertRule = (body: unknown) => post('/aigate/alert/rule', body)
  const updateAlertRule = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/alert/rule/${id}`, body)
  const delAlertRule = (id: string) => del(`/aigate/alert/rule/${id}`)

  // Billing
  const getBillingList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/billing', params, cacheConfig.list)
  const getBillingDetail = (id: string) => get<ApiRecord>(`/aigate/billing/${id}`)
  const generateBilling = (period?: string) => post('/aigate/billing/generate', period ? { period } : {})

  // API Log
  const getApiLogList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/api-log', params, cacheConfig.list)
  const cleanupApiLogs = () => post('/aigate/api-log/cleanup')

  // Global Search
  const globalSearch = (keyword: string) => get<ApiRecord[]>('/aigate/search', { keyword })
  const chatWithBot = (body: { message: string, conversationId?: string }) =>
    post<BotChatResponse>('/aigate/bot/chat', body)
  const getBotConversations = () => get<BotConversation[]>('/aigate/bot/conversations')
  const getNotificationPrefs = () =>
    get<Array<{ alertType: string, channels: string[] }>>('/aigate/me/notification-pref')
  const saveNotificationPrefs = (prefs: Array<{ alertType: string, channels: string[] }>) =>
    post<Array<{ alertType: string, channels: string[] }>>('/aigate/me/notification-pref', { prefs })

  return {
    getDashboard,
    getMyWorkbench,
    getMyApiLogList,
    getMyApiKeyList,
    getPasswordState,
    forceChangePassword,
    createMyApiKey,
    updateMyApiKey,
    getQuotaRequests,
    createQuotaRequest,
    decideQuotaRequest,
    getOrgList,
    getOrgTree,
    insertOrg,
    updateOrg,
    getTenantPackageList,
    insertTenantPackage,
    updateTenantPackage,
    delTenantPackage,
    getActiveOrganizations,
    switchActiveOrganization,
    getMemberList,
    insertMember,
    delMember,
    getChannelList,
    insertChannel,
    updateChannel,
    delChannel,
    checkChannelHealth,
    getChannelPresets,
    getChannelCredentials,
    insertChannelCredential,
    updateChannelCredential,
    delChannelCredential,
    testChannel,
    syncChannelModels,
    getComboList,
    insertCombo,
    updateCombo,
    delCombo,
    getApiKeyList,
    getApiKeyDetail,
    insertApiKey,
    updateApiKey,
    delApiKey,
    getModelList,
    insertModel,
    updateModel,
    delModel,
    getMcpToolList,
    getMcpTool,
    insertMcpTool,
    updateMcpTool,
    delMcpTool,
    testMcpTool,
    createMcpToolVersion,
    getMcpMarketplace,
    installMcpPreset,
    getMcpMarketplaceDetail,
    installMcpMarketplacePreset,
    batchInstallMcpMarketplace,
    getGatewayOverview,
    getAgentList,
    getAgent,
    insertAgent,
    updateAgent,
    delAgent,
    chatWithAgent,
    getAgentConversations,
    getKnowledgeBaseList,
    getKnowledgeBase,
    insertKnowledgeBase,
    updateKnowledgeBase,
    delKnowledgeBase,
    getStorageInstances,
    getKbDocuments,
    uploadKbDocument,
    delKbDocument,
    retryKbDocument,
    getKbChunks,
    searchKnowledgeBase,
    qaKnowledgeBase,
    rebuildKbVectors,
    getSkillList,
    getSkill,
    insertSkill,
    updateSkill,
    delSkill,
    importSkill,
    getSkillFiles,
    insertSkillFile,
    updateSkillFile,
    delSkillFile,
    getPromptList,
    insertPrompt,
    updatePrompt,
    delPrompt,
    getPromptVersions,
    restorePromptVersion,
    renderPrompt,
    runPrompt,
    exportPrompts,
    importPrompts,
    getAlertList,
    markAlertRead,
    updateAlertStatus,
    delAlert,
    runAlertCheck,
    getAlertRules,
    insertAlertRule,
    updateAlertRule,
    delAlertRule,
    getBillingList,
    getBillingDetail,
    generateBilling,
    getApiLogList,
    cleanupApiLogs,
    globalSearch,
    chatWithBot,
    getBotConversations,
    getNotificationPrefs,
    saveNotificationPrefs,
  }
}
