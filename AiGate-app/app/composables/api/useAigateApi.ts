import type { CacheConfig } from '@/composables/useRequest'

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
  const getDashboard = (params?: Record<string, unknown>) => get('/aigate/dashboard', params, cacheConfig.stats)

  // Organization
  const getOrgList = (params?: Record<string, unknown>) => get('/aigate/organization', params, cacheConfig.list)
  const getOrgTree = () => get('/aigate/organization/tree', undefined, cacheConfig.list)
  const insertOrg = (body: unknown) => post('/aigate/organization', body)
  const updateOrg = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/organization/${id}`, body)

  // Member
  const getMemberList = (params?: Record<string, unknown>) => get('/aigate/member', params, cacheConfig.list)
  const insertMember = (body: unknown) => post('/aigate/member', body)
  const delMember = (id: string) => del(`/aigate/member/${id}`)

  // Channel
  const getChannelList = (params?: Record<string, unknown>) => get('/aigate/channel', params, cacheConfig.list)
  const insertChannel = (body: unknown) => post('/aigate/channel', body)
  const updateChannel = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/channel/${id}`, body)
  const delChannel = (id: string) => del(`/aigate/channel/${id}`)
  const checkChannelHealth = (channelId?: string) => post('/aigate/channel/health-check', channelId ? { channelId } : {})

  // API Key
  const getApiKeyList = (params?: Record<string, unknown>) => get('/aigate/api-key', params, cacheConfig.list)
  const insertApiKey = (body: unknown) => post('/aigate/api-key', body)
  const updateApiKey = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/api-key/${id}`, body)
  const delApiKey = (id: string) => del(`/aigate/api-key/${id}`)

  // Model
  const getModelList = (params?: Record<string, unknown>) => get('/aigate/model', params, cacheConfig.list)

  // MCP Tool
  const getMcpToolList = (params?: Record<string, unknown>) => get('/aigate/mcp-tool', params, cacheConfig.list)
  const insertMcpTool = (body: unknown) => post('/aigate/mcp-tool', body)
  const updateMcpTool = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/mcp-tool/${id}`, body)
  const delMcpTool = (id: string) => del(`/aigate/mcp-tool/${id}`)
  const testMcpTool = (body: unknown) => post('/aigate/mcp-tool/test', body)
  const getMcpMarketplace = () => get('/aigate/mcp-tool/marketplace', undefined, cacheConfig.list)
  const installMcpPreset = (presetId: string) => post('/aigate/mcp-tool/install', { presetId })
  const getGatewayOverview = () => get('/aigate/gateway', undefined, cacheConfig.stats)

  // Agent
  const getAgentList = (params?: Record<string, unknown>) => get('/aigate/agent', params, cacheConfig.list)
  const getAgent = (id: string) => get(`/aigate/agent/${id}`)
  const insertAgent = (body: unknown) => post('/aigate/agent', body)
  const updateAgent = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/agent/${id}`, body)
  const delAgent = (id: string) => del(`/aigate/agent/${id}`)
  const chatWithAgent = (id: string, message: string, conversationId?: string) => post(`/aigate/agent/${id}/chat`, { message, conversationId })
  const getAgentConversations = (id: string) => get(`/aigate/agent/${id}/conversations`)

  // Knowledge Base
  const getKnowledgeBaseList = (params?: Record<string, unknown>) => get('/aigate/knowledge-base', params, cacheConfig.list)
  const insertKnowledgeBase = (body: unknown) => post('/aigate/knowledge-base', body)
  const updateKnowledgeBase = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/knowledge-base/${id}`, body)
  const delKnowledgeBase = (id: string) => del(`/aigate/knowledge-base/${id}`)
  const getKbDocuments = (kbId: string) => get(`/aigate/knowledge-base/${kbId}/documents`)
  const uploadKbDocument = (kbId: string, body: unknown) => post(`/aigate/knowledge-base/${kbId}/documents`, body)
  const delKbDocument = (kbId: string, docId: string) => del(`/aigate/knowledge-base/${kbId}/documents/${docId}`)

  // Prompt
  const getPromptList = (params?: Record<string, unknown>) => get('/aigate/prompt', params, cacheConfig.list)
  const insertPrompt = (body: unknown) => post('/aigate/prompt', body)
  const updatePrompt = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/prompt/${id}`, body)
  const delPrompt = (id: string) => del(`/aigate/prompt/${id}`)
  const getPromptVersions = (id: string) => get(`/aigate/prompt/${id}/versions`)
  const restorePromptVersion = (id: string, versionId: string) => post(`/aigate/prompt/${id}/versions/${versionId}/restore`)
  const exportPrompts = () => get('/aigate/prompt/export')
  const importPrompts = (body: unknown) => post('/aigate/prompt/import', body)

  // Alert
  const getAlertList = (params?: Record<string, unknown>) => get('/aigate/alert', params, cacheConfig.list)
  const markAlertRead = (id: string) => put(`/aigate/alert/${id}`)
  const delAlert = (id: string) => del(`/aigate/alert/${id}`)
  const runAlertCheck = () => post('/aigate/alert/check')
  const getAlertRules = () => get('/aigate/alert/rule', undefined, cacheConfig.list)
  const insertAlertRule = (body: unknown) => post('/aigate/alert/rule', body)
  const updateAlertRule = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/alert/rule/${id}`, body)
  const delAlertRule = (id: string) => del(`/aigate/alert/rule/${id}`)

  // Billing
  const getBillingList = (params?: Record<string, unknown>) => get('/aigate/billing', params, cacheConfig.list)
  const getBillingDetail = (id: string) => get(`/aigate/billing/${id}`)
  const generateBilling = (period?: string) => post('/aigate/billing/generate', period ? { period } : {})

  // API Log
  const getApiLogList = (params?: Record<string, unknown>) => get('/aigate/api-log', params, cacheConfig.list)
  const cleanupApiLogs = () => post('/aigate/api-log/cleanup')

  // Global Search
  const globalSearch = (keyword: string) => get('/aigate/search', { keyword })

  return {
    getDashboard,
    getOrgList, getOrgTree, insertOrg, updateOrg,
    getMemberList, insertMember, delMember,
    getChannelList, insertChannel, updateChannel, delChannel, checkChannelHealth,
    getApiKeyList, insertApiKey, updateApiKey, delApiKey,
    getModelList,
    getMcpToolList, insertMcpTool, updateMcpTool, delMcpTool, testMcpTool, getMcpMarketplace, installMcpPreset,
    getGatewayOverview,
    getAgentList, getAgent, insertAgent, updateAgent, delAgent, chatWithAgent, getAgentConversations,
    getKnowledgeBaseList, insertKnowledgeBase, updateKnowledgeBase, delKnowledgeBase,
    getKbDocuments, uploadKbDocument, delKbDocument,
    getPromptList, insertPrompt, updatePrompt, delPrompt, getPromptVersions, restorePromptVersion, exportPrompts, importPrompts,
    getAlertList, markAlertRead, delAlert, runAlertCheck, getAlertRules, insertAlertRule, updateAlertRule, delAlertRule,
    getBillingList, getBillingDetail, generateBilling,
    getApiLogList, cleanupApiLogs,
    globalSearch,
  }
}
