export function useAigateApi() {
  const { get, post, put, del } = useRequest()

  // Dashboard
  const getDashboard = () => get('/aigate/dashboard')

  // Organization
  const getOrgList = (params?: Record<string, any>) => get('/aigate/organization', params)
  const insertOrg = (body: any) => post('/aigate/organization', body)
  const updateOrg = ({ id, ...body }: any) => put(`/aigate/organization/${id}`, body)

  // Channel
  const getChannelList = (params?: Record<string, any>) => get('/aigate/channel', params)
  const insertChannel = (body: any) => post('/aigate/channel', body)
  const updateChannel = ({ id, ...body }: any) => put(`/aigate/channel/${id}`, body)
  const delChannel = (id: string) => del(`/aigate/channel/${id}`)

  // API Key
  const getApiKeyList = (params?: Record<string, any>) => get('/aigate/api-key', params)
  const insertApiKey = (body: any) => post('/aigate/api-key', body)
  const updateApiKey = ({ id, ...body }: any) => put(`/aigate/api-key/${id}`, body)
  const delApiKey = (id: string) => del(`/aigate/api-key/${id}`)

  // Model
  const getModelList = (params?: Record<string, any>) => get('/aigate/model', params)

  // MCP Tool
  const getMcpToolList = (params?: Record<string, any>) => get('/aigate/mcp-tool', params)
  const insertMcpTool = (body: any) => post('/aigate/mcp-tool', body)
  const updateMcpTool = ({ id, ...body }: any) => put(`/aigate/mcp-tool/${id}`, body)
  const delMcpTool = (id: string) => del(`/aigate/mcp-tool/${id}`)

  // Agent
  const getAgentList = (params?: Record<string, any>) => get('/aigate/agent', params)
  const insertAgent = (body: any) => post('/aigate/agent', body)
  const updateAgent = ({ id, ...body }: any) => put(`/aigate/agent/${id}`, body)
  const delAgent = (id: string) => del(`/aigate/agent/${id}`)

  // Knowledge Base
  const getKnowledgeBaseList = (params?: Record<string, any>) => get('/aigate/knowledge-base', params)
  const insertKnowledgeBase = (body: any) => post('/aigate/knowledge-base', body)
  const updateKnowledgeBase = ({ id, ...body }: any) => put(`/aigate/knowledge-base/${id}`, body)
  const delKnowledgeBase = (id: string) => del(`/aigate/knowledge-base/${id}`)

  // Prompt
  const getPromptList = (params?: Record<string, any>) => get('/aigate/prompt', params)
  const insertPrompt = (body: any) => post('/aigate/prompt', body)
  const updatePrompt = ({ id, ...body }: any) => put(`/aigate/prompt/${id}`, body)
  const delPrompt = (id: string) => del(`/aigate/prompt/${id}`)

  // Alert
  const getAlertList = () => get('/aigate/alert')
  const markAlertRead = (id: string) => put(`/aigate/alert/${id}`)

  // Billing
  const getBillingList = () => get('/aigate/billing')

  // API Log
  const getApiLogList = (params?: Record<string, any>) => get('/aigate/api-log', params)

  return {
    getDashboard,
    getOrgList, insertOrg, updateOrg,
    getChannelList, insertChannel, updateChannel, delChannel,
    getApiKeyList, insertApiKey, updateApiKey, delApiKey,
    getModelList,
    getMcpToolList, insertMcpTool, updateMcpTool, delMcpTool,
    getAgentList, insertAgent, updateAgent, delAgent,
    getKnowledgeBaseList, insertKnowledgeBase, updateKnowledgeBase, delKnowledgeBase,
    getPromptList, insertPrompt, updatePrompt, delPrompt,
    getAlertList, markAlertRead,
    getBillingList,
    getApiLogList,
  }
}
