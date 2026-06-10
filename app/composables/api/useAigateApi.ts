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
  messages: { role: string; content: string; time: string }[]
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

  // API Key
  const getApiKeyList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/api-key', params, cacheConfig.list)
  const insertApiKey = (body: unknown) => post('/aigate/api-key', body)
  const updateApiKey = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/api-key/${id}`, body)
  const delApiKey = (id: string) => del(`/aigate/api-key/${id}`)

  // Model
  const getModelList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/model', params, cacheConfig.list)

  // MCP Tool
  const getMcpToolList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/mcp-tool', params, cacheConfig.list)
  const insertMcpTool = (body: unknown) => post('/aigate/mcp-tool', body)
  const updateMcpTool = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/mcp-tool/${id}`, body)
  const delMcpTool = (id: string) => del(`/aigate/mcp-tool/${id}`)
  const testMcpTool = (body: unknown) => post<ApiRecord>('/aigate/mcp-tool/test', body)
  const getMcpMarketplace = () => get<ApiRecord[]>('/aigate/mcp-tool/marketplace', undefined, cacheConfig.list)
  const installMcpPreset = (presetId: string) => post('/aigate/mcp-tool/install', { presetId })
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
  const insertKnowledgeBase = (body: unknown) => post('/aigate/knowledge-base', body)
  const updateKnowledgeBase = ({ id, ...body }: { id: string } & Record<string, unknown>) =>
    put(`/aigate/knowledge-base/${id}`, body)
  const delKnowledgeBase = (id: string) => del(`/aigate/knowledge-base/${id}`)
  const getKbDocuments = (kbId: string) => get<ApiRecord[]>(`/aigate/knowledge-base/${kbId}/documents`)
  const uploadKbDocument = (kbId: string, body: unknown) => post(`/aigate/knowledge-base/${kbId}/documents`, body)
  const delKbDocument = (kbId: string, docId: string) => del(`/aigate/knowledge-base/${kbId}/documents/${docId}`)

  // Prompt
  const getPromptList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/prompt', params, cacheConfig.list)
  const insertPrompt = (body: unknown) => post('/aigate/prompt', body)
  const updatePrompt = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/prompt/${id}`, body)
  const delPrompt = (id: string) => del(`/aigate/prompt/${id}`)
  const getPromptVersions = (id: string) => get<PromptVersion[]>(`/aigate/prompt/${id}/versions`)
  const restorePromptVersion = (id: string, versionId: string) =>
    post(`/aigate/prompt/${id}/versions/${versionId}/restore`)
  const exportPrompts = () => get<ApiRecord[]>('/aigate/prompt/export')
  const importPrompts = (body: unknown) => post<ImportResult>('/aigate/prompt/import', body)

  // Alert
  const getAlertList = (params?: Record<string, unknown>) =>
    get<ListResponse>('/aigate/alert', params, cacheConfig.list)
  const markAlertRead = (id: string) => put(`/aigate/alert/${id}`)
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

  return {
    getDashboard,
    getMyWorkbench,
    getMyApiLogList,
    getMyApiKeyList,
    createMyApiKey,
    updateMyApiKey,
    getQuotaRequests,
    createQuotaRequest,
    decideQuotaRequest,
    getOrgList,
    getOrgTree,
    insertOrg,
    updateOrg,
    getMemberList,
    insertMember,
    delMember,
    getChannelList,
    insertChannel,
    updateChannel,
    delChannel,
    checkChannelHealth,
    getApiKeyList,
    insertApiKey,
    updateApiKey,
    delApiKey,
    getModelList,
    getMcpToolList,
    insertMcpTool,
    updateMcpTool,
    delMcpTool,
    testMcpTool,
    getMcpMarketplace,
    installMcpPreset,
    getGatewayOverview,
    getAgentList,
    getAgent,
    insertAgent,
    updateAgent,
    delAgent,
    chatWithAgent,
    getAgentConversations,
    getKnowledgeBaseList,
    insertKnowledgeBase,
    updateKnowledgeBase,
    delKnowledgeBase,
    getKbDocuments,
    uploadKbDocument,
    delKbDocument,
    getPromptList,
    insertPrompt,
    updatePrompt,
    delPrompt,
    getPromptVersions,
    restorePromptVersion,
    exportPrompts,
    importPrompts,
    getAlertList,
    markAlertRead,
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
  }
}
