export type Role = 'sys_admin' | 'tenant_admin' | 'dept_lead' | 'project_lead' | 'user'
export type Theme = 'dark' | 'light' | 'apple'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: Role
  tenantId: string
  tenantName: string
  department?: string
}

export interface Tenant {
  id: string
  name: string
  logo?: string
  parentId?: string
  quota: Quota
}

export interface Quota {
  tokenLimit: number
  tokenUsed: number
  costLimit: number
  costUsed: number
  period: 'month' | 'quarter' | 'year'
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  status: 'active' | 'rate_limited' | 'banned' | 'expired' | 'expiring_soon'
  userId: string
  userName: string
  expiresAt: string
  createdAt: string
  lastUsedAt?: string
  usage7d: number
}

export interface MCPTool {
  id: string
  name: string
  description: string
  url: string
  protocol: 'stdio' | 'sse' | 'http'
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  category: string
  isPublic: boolean
  usageCount: number
}

export interface Agent {
  id: string
  name: string
  description: string
  type: 'bot' | 'project' | 'department'
  status: 'running' | 'draft' | 'error'
  model: string
  knowledgeBases: string[]
  mcpTools: string[]
  usage7d: number
  avgResponseTime: number
}

export interface Alert {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  target: string
  createdAt: string
  status: 'pending' | 'processing' | 'resolved'
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}
