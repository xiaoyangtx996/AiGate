import { clearSession, session } from './session'

export const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
export const gatewayBaseURL = (import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8081').replace(/\/$/, '')

export type Organization = { id: string; tenant_id: string; name: string; created_at: string; updated_at: string }
export type User = { id: string; tenant_id: string; organization_id: string; email: string; display_name: string; active: boolean; created_at: string; updated_at: string }
export type Role = { id: string; code: string; name: string; description: string }
export type APIKey = { id: string; tenant_id: string; organization_id: string; user_id: string; name: string; prefix: string; allowed_cidrs: string[]; active: boolean }
export type Channel = { id: string; tenant_id: string; name: string; base_url: string; active: boolean }
export type APILog = { id: string; trace_id: string; organization_id: string; user_id: string; model: string; input_tokens: number; output_tokens: number; total_tokens: number; cost_micros: number | null; estimated: boolean; blocked: boolean; status_code: number; error_code: string; created_at: string }
export type Alert = { id: string; scope_type: 'tenant' | 'organization' | 'user'; scope_id: string; threshold: number; usage_percent: number; used_tokens: number; limit_tokens: number; delivery_status: string; last_error?: string; created_at: string }
export type AlertPolicy = { tenant_id: string; thresholds: number[]; webhook_url: string; cooldown_seconds: number; enabled: boolean }
export type TenantOption = { id: string; name: string }
export type Menu = { code: string; label: string; path: string }
export type SessionInfo = { identity: { tenant_id: string; sub: string; roles: string[]; platform?: boolean; display_name?: string }; tenant: TenantOption; tenants: TenantOption[]; menus: Menu[] }
export type MenuSetting = Menu & { enabled: boolean }

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
}

export async function downloadLogs(params: URLSearchParams) {
  const response = await fetch(`${apiBaseURL}/v1/api-logs.csv?${params}`, { headers: authHeaders() })
  if (!response.ok) throw await responseError(response)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `aigate-api-logs-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function gatewaySmoke(payload: { apiKey: string; model: string; prompt: string }) {
  const response = await fetch(`${gatewayBaseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${payload.apiKey}`, 'Content-Type': 'application/json' },
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
