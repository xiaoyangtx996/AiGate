import { clearSession, session } from './session'

export const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
export const gatewayBaseURL = (import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8081').replace(/\/$/, '')

export type Organization = { id: string; tenant_id: string; name: string; created_at: string; updated_at: string }
export type User = { id: string; tenant_id: string; organization_id: string; email: string; display_name: string; active: boolean; created_at: string; updated_at: string }
export type Role = { id: string; code: string; name: string; description: string }
export type APIKey = { id: string; tenant_id: string; organization_id: string; user_id: string; name: string; prefix: string; allowed_cidrs: string[]; active: boolean }
export type Channel = { id: string; tenant_id: string; name: string; base_url: string; active: boolean }
export type APILog = { id: string; trace_id: string; organization_id: string; project_id: string; project_name: string; user_id: string; model: string; input_tokens: number; output_tokens: number; total_tokens: number; cost_micros: number | null; estimated: boolean; blocked: boolean; status_code: number; error_code: string; created_at: string }
export type Alert = { id: string; scope_type: 'tenant' | 'organization' | 'user'; scope_id: string; threshold: number; usage_percent: number; used_tokens: number; limit_tokens: number; delivery_status: string; last_error?: string; created_at: string }
export type AlertPolicy = { tenant_id: string; thresholds: number[]; webhook_url: string; cooldown_seconds: number; enabled: boolean }
export type TenantOption = { id: string; name: string }
export type Menu = { code: string; label: string; path: string }
export type SessionInfo = { identity: { tenant_id: string; sub: string; roles: string[]; platform?: boolean; display_name?: string }; tenant: TenantOption; tenants: TenantOption[]; menus: Menu[] }
export type MenuSetting = Menu & { enabled: boolean }
export type Project = { id: string; tenant_id: string; organization_id: string; name: string }
export type KnowledgeBase = { id: string; project_id: string; name: string; created_by: string }
export type KnowledgeDocument = { id: string; knowledge_base_id: string; filename: string; media_type: string; status: string; last_error?: string; size_bytes: number }
export type Citation = { document_id: string; span_start: number; span_end: number }
export type MCPAsset = { id: string; name: string; source: string; version: string; health_status: string; consecutive_failures: number; active: boolean }
export type MarketplaceEntry = { id: string; name: string; description: string; version: string }
export type ProjectAgent = { id: string; name: string; model: string; system_prompt: string; knowledge_base_ids: string[]; mcp_asset_ids: string[]; skill_ids?: string[]; skill_hook?: object }
export type UsageDaily = { day: string; organization_id: string; organization_name: string; project_id: string; project_name: string; calls: number; llm_calls: number; mcp_calls: number; input_tokens: number; output_tokens: number; cost_micros: number; llm_cost_micros: number; mcp_cost_micros: number; estimated_calls: number }
export type QuotaUtilization = { scope_type: string; scope_id: string; limit_tokens: number; used_tokens: number; reserved_tokens: number; percent: number }
export type UsageSummary = { daily: UsageDaily[]; quotas: QuotaUtilization[] }

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export class TenantSelectionError extends APIError {
  constructor(public tenants: TenantOption[]) {
    super(409, '请选择要进入的租户')
  }
}

export async function login(payload: { tenant_id?: string; email: string; password: string }) {
  const response = await fetch(`${apiBaseURL}/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await response.json().catch(() => ({})) as { token?: string; token_type?: string; error?: string; tenants?: TenantOption[] }
  if (response.status === 409 && body.error === 'tenant_selection_required') throw new TenantSelectionError(body.tenants || [])
  if (!response.ok || !body.token) throw new APIError(response.status, body.error || '登录失败')
  return { token: body.token, token_type: body.token_type || 'Bearer' }
}

export const api = {
  session: () => request<SessionInfo>('/v1/session'),
  switchTenant: (tenant_id: string) => request<{ token: string; token_type: string }>('/v1/auth/switch-tenant', { method: 'POST', body: JSON.stringify({ tenant_id }) }),
  menuSettings: () => request<MenuSetting[]>('/v1/menu-settings'),
  setMenuEnabled: (code: string, enabled: boolean) => request<void>(`/v1/menu-settings/${code}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  organizations: () => request<Organization[]>('/v1/organizations'),
  createOrganization: (name: string) => request<Organization>('/v1/organizations', { method: 'POST', body: JSON.stringify({ name }) }),
  users: () => request<User[]>('/v1/users'),
  roles: () => request<Role[]>('/v1/roles'),
  createRole: (payload: object) => request<Role>('/v1/roles', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRole: (id: string) => request<void>(`/v1/roles/${id}`, { method: 'DELETE' }),
  createUser: (payload: object) => request<User>('/v1/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id: string, payload: object) => request<User>(`/v1/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUser: (id: string) => request<void>(`/v1/users/${id}`, { method: 'DELETE' }),
  keys: () => request<APIKey[]>('/v1/api-keys'),
  createKey: (payload: object) => request<{ key: APIKey; secret: string }>('/v1/api-keys', { method: 'POST', body: JSON.stringify(payload) }),
  revokeKey: (id: string) => request<void>(`/v1/api-keys/${id}`, { method: 'DELETE' }),
  setQuota: (scope: string, id: string, limit_tokens: number) => request<void>(`/v1/quotas/${scope}/${id}`, { method: 'PUT', body: JSON.stringify({ limit_tokens }) }),
  logs: (params: URLSearchParams) => request<APILog[]>(`/v1/api-logs?${params}`),
  alerts: (limit = 200) => request<Alert[]>(`/v1/alerts?limit=${limit}`),
  alertPolicy: () => request<AlertPolicy>('/v1/alert-policy'),
  saveAlertPolicy: (payload: object) => request<void>('/v1/alert-policy', { method: 'PUT', body: JSON.stringify(payload) }),
  channels: () => request<Channel[]>('/v1/channels'),
  createChannel: (payload: object) => request<Channel>('/v1/channels', { method: 'POST', body: JSON.stringify(payload) }),
  updateChannel: (id: string, payload: object) => request<Channel>(`/v1/channels/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  projects: () => request<Project[]>('/v1/projects'),
  projectContexts: () => request<Project[]>('/v1/project-contexts'),
  usageProjectContexts: () => request<Project[]>('/v1/project-contexts?scope=usage'),
  createProject: (payload: object) => request<Project>('/v1/projects', { method: 'POST', body: JSON.stringify(payload) }),
  projectMembers: (projectID: string) => request<User[]>(`/v1/projects/${projectID}/members`),
  projectMembersBatch: () => request<Record<string, User[]>>('/v1/project-members'),
  projectMemberCandidatesBatch: () => request<Record<string, User[]>>('/v1/project-member-candidates'),
  projectMemberCandidates: (projectID: string) => request<User[]>(`/v1/projects/${projectID}/member-candidates`),
  grantProject: (projectID: string, userID: string) => request<void>(`/v1/projects/${projectID}/members/${userID}`, { method: 'PUT' }),
  revokeProject: (projectID: string, userID: string) => request<void>(`/v1/projects/${projectID}/members/${userID}`, { method: 'DELETE' }),
  knowledgeBases: (projectID: string) => request<KnowledgeBase[]>(`/v1/projects/${projectID}/knowledge-bases`),
  createKnowledgeBase: (projectID: string, name: string) => request<KnowledgeBase>(`/v1/projects/${projectID}/knowledge-bases`, { method: 'POST', body: JSON.stringify({ name }) }),
  knowledgeDocuments: (projectID: string, kbID: string) => request<KnowledgeDocument[]>(`/v1/projects/${projectID}/knowledge-bases/${kbID}/documents`),
  uploadDocument: (projectID: string, kbID: string, filename: string, file: File) => request<KnowledgeDocument>(`/v1/projects/${projectID}/knowledge-bases/${kbID}/documents?filename=${encodeURIComponent(filename)}`, { method: 'POST', headers: { 'Content-Type': file.type || 'text/markdown' }, body: file as unknown as BodyInit }),
  documentStatus: (projectID: string, documentID: string) => request<KnowledgeDocument>(`/v1/projects/${projectID}/documents/${documentID}`),
  retryDocument: (projectID: string, documentID: string) => request<void>(`/v1/projects/${projectID}/documents/${documentID}/retry`, { method: 'POST' }),
  searchKnowledge: (projectID: string, kbID: string, query: string) => request<{ results: Array<{ content: string; score: number; citation: Citation }> }>(`/v1/projects/${projectID}/knowledge-bases/${kbID}/search`, { method: 'POST', body: JSON.stringify({ query, limit: 5 }) }),
  marketplace: () => request<MarketplaceEntry[]>('/v1/mcp/marketplace'),
  installMCP: (entryID: string, name?: string) => request<MCPAsset>(`/v1/mcp/marketplace/${entryID}/install`, { method: 'POST', body: JSON.stringify({ name }) }),
  mcpAssets: () => request<MCPAsset[]>('/v1/mcp/assets'),
  registerMCP: (payload: object) => request<MCPAsset>('/v1/mcp/assets', { method: 'POST', body: JSON.stringify(payload) }),
  grantMCP: (projectID: string, assetID: string, agentID = '') => request<void>(`/v1/projects/${projectID}/mcp/${assetID}/grants`, { method: 'PUT', body: JSON.stringify({ agent_id: agentID }) }),
  projectMCPAssets: (projectID: string) => request<MCPAsset[]>(`/v1/projects/${projectID}/mcp/assets`),
  agents: (projectID: string) => request<ProjectAgent[]>(`/v1/projects/${projectID}/agents`),
  createAgent: (projectID: string, payload: object) => request<ProjectAgent>(`/v1/projects/${projectID}/agents`, { method: 'POST', body: JSON.stringify(payload) }),
  agentChat: (projectID: string, agentID: string, payload: object) => request<{ conversation_id: string; answer: string; citations: Citation[]; gateway_trace_id: string }>(`/v1/projects/${projectID}/agents/${agentID}/chat`, { method: 'POST', body: JSON.stringify(payload) }),
  botChat: (question: string) => request<{ answer: string; usage: object }>('/v1/bot/chat', { method: 'POST', body: JSON.stringify({ question }) }),
  usage: (params: URLSearchParams) => request<UsageSummary>(`/v1/usage/summary?${params}`),
}

export async function downloadCostRollup(params: URLSearchParams) {
  await downloadCSV(`/v1/usage/cost-rollup.csv?${params}`, `aigate-cost-rollup-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function downloadLogs(params: URLSearchParams) {
  await downloadCSV(`/v1/api-logs.csv?${params}`, `aigate-api-logs-${new Date().toISOString().slice(0, 10)}.csv`)
}

async function downloadCSV(path: string, filename: string) {
  const response = await fetch(`${apiBaseURL}${path}`, { headers: authHeaders() })
  if (!response.ok) throw await responseError(response)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function gatewaySmoke(payload: { apiKey: string; model: string; prompt: string; projectID?: string }) {
  const response = await fetch(`${gatewayBaseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${payload.apiKey}`, 'Content-Type': 'application/json', ...(payload.projectID ? { 'X-AiGate-Project-ID': payload.projectID } : {}) },
    body: JSON.stringify({ model: payload.model, messages: [{ role: 'user', content: payload.prompt }], max_tokens: 32 }),
  })
  const body = await response.json().catch(() => ({}))
  return { status: response.status, traceID: response.headers.get('X-Trace-ID') || '', body }
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> || {}) }
  if (authenticated) Object.assign(headers, authHeaders())
  const response = await fetch(`${apiBaseURL}${path}`, { ...init, headers })
  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearSession()
      window.dispatchEvent(new Event('aigate:unauthorized'))
    }
    throw await responseError(response)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function authHeaders() {
  const headers: Record<string, string> = {}
  if (session.token) headers.Authorization = `Bearer ${session.token}`
  return headers
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string }
  return new APIError(response.status, body.error || `请求失败（${response.status}）`)
}
