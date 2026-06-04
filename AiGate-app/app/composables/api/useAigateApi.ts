export function useAigateApi() {
  const { get, post, put, del } = useRequest()

  // Dashboard
  const getDashboard = () => get('/aigate/dashboard')

  // Organization
  const getOrgList = (params?: Record<string, unknown>) => get('/aigate/organization', params)
  const getOrgTree = () => get('/aigate/organization/tree')
  const insertOrg = (body: unknown) => post('/aigate/organization', body)
  const updateOrg = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/organization/${id}`, body)

  // Member
  const getMemberList = (params?: Record<string, unknown>) => get('/aigate/member', params)
  const insertMember = (body: unknown) => post('/aigate/member', body)
  const delMember = (id: string) => del(`/aigate/member/${id}`)

  // Channel
  const getChannelList = (params?: Record<string, unknown>) => get('/aigate/channel', params)
  const insertChannel = (body: unknown) => post('/aigate/channel', body)
  const updateChannel = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/channel/${id}`, body)
  const delChannel = (id: string) => del(`/aigate/channel/${id}`)
  const checkChannelHealth = (channelId?: string) => post('/aigate/channel/health-check', channelId ? { channelId } : {})

  // API Key
  const getApiKeyList = (params?: Record<string, unknown>) => get('/aigate/api-key', params)
  const insertApiKey = (body: unknown) => post('/aigate/api-key', body)
  const updateApiKey = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/api-key/${id}`, body)
  const delApiKey = (id: string) => del(`/aigate/api-key/${id}`)

  // Model
  const getModelList = (params?: Record<string, unknown>) => get('/aigate/model', params)

  // MCP Tool
  const getMcpToolList = (params?: Record<string, unknown>) => get('/aigate/mcp-tool', params)
  const insertMcpTool = (body: unknown) => post('/aigate/mcp-tool', body)
  const updateMcpTool = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/mcp-tool/${id}`, body)
  const delMcpTool = (id: string) => del(`/aigate/mcp-tool/${id}`)

  // Agent
  const getAgentList = (params?: Record<string, unknown>) => get('/aigate/agent', params)
  const getAgent = (id: string) => get(`/aigate/agent/${id}`)
  const insertAgent = (body: unknown) => post('/aigate/agent', body)
  const updateAgent = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/agent/${id}`, body)
  const delAgent = (id: string) => del(`/aigate/agent/${id}`)
  const chatWithAgent = (id: string, message: string, conversationId?: string) => post(`/aigate/agent/${id}/chat`, { message, conversationId })
  const getAgentConversations = (id: string) => get(`/aigate/agent/${id}/conversations`)

  // Knowledge Base
  const getKnowledgeBaseList = (params?: Record<string, unknown>) => get('/aigate/knowledge-base', params)
  const insertKnowledgeBase = (body: unknown) => post('/aigate/knowledge-base', body)
  const updateKnowledgeBase = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/knowledge-base/${id}`, body)
  const delKnowledgeBase = (id: string) => del(`/aigate/knowledge-base/${id}`)
  const getKbDocuments = (kbId: string) => get(`/aigate/knowledge-base/${kbId}/documents`)
  const uploadKbDocument = (kbId: string, body: unknown) => post(`/aigate/knowledge-base/${kbId}/documents`, body)
  const delKbDocument = (kbId: string, docId: string) => del(`/aigate/knowledge-base/${kbId}/documents/${docId}`)

  // Prompt
  const getPromptList = (params?: Record<string, unknown>) => get('/aigate/prompt', params)
  const insertPrompt = (body: unknown) => post('/aigate/prompt', body)
  const updatePrompt = ({ id, ...body }: { id: string } & Record<string, unknown>) => put(`/aigate/prompt/${id}`, body)
  const delPrompt = (id: string) => del(`/aigate/prompt/${id}`)

  // Alert
  const getAlertList = () => get('/aigate/alert')
  const markAlertRead = (id: string) => put(`/aigate/alert/${id}`)
  const runAlertCheck = () => post('/aigate/alert/check')

  // Billing
  const getBillingList = () => get('/aigate/billing')
  const generateBilling = (period?: string) => post('/aigate/billing/generate', period ? { period } : {})

  // API Log
  const getApiLogList = (params?: Record<string, unknown>) => get('/aigate/api-log', params)
  const cleanupApiLogs = () => post('/aigate/api-log/cleanup')

  return {
    getDashboard,
    getOrgList, getOrgTree, insertOrg, updateOrg,
    getMemberList, insertMember, delMember,
    getChannelList, insertChannel, updateChannel, delChannel, checkChannelHealth,
    getApiKeyList, insertApiKey, updateApiKey, delApiKey,
    getModelList,
    getMcpToolList, insertMcpTool, updateMcpTool, delMcpTool,
    getAgentList, getAgent, insertAgent, updateAgent, delAgent, chatWithAgent, getAgentConversations,
    getKnowledgeBaseList, insertKnowledgeBase, updateKnowledgeBase, delKnowledgeBase,
    getKbDocuments, uploadKbDocument, delKbDocument,
    getPromptList, insertPrompt, updatePrompt, delPrompt,
    getAlertList, markAlertRead, runAlertCheck,
    getBillingList, generateBilling,
    getApiLogList, cleanupApiLogs,
  }
}
