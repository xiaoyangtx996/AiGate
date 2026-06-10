/**
 * 通用 API 响应类型
 */
export interface ApiResponse<T = unknown> {
  /** 请求是否成功 */
  success: boolean
  /** 响应数据 */
  data?: T
  /** 响应消息 */
  message?: string
  /** 响应状态码 */
  code?: number
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[]
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 通用错误类型
 */
export interface ApiError {
  /** 错误代码 */
  code: string
  /** 错误消息 */
  message: string
  /** 错误详情 */
  details?: Record<string, unknown>
}

/**
 * 请求选项扩展
 */
export interface RequestOptions {
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 请求超时时间（毫秒） */
  timeout?: number
}

/**
 * API 客户端配置
 */
export interface ApiClientConfig {
  /** API 基础 URL */
  baseURL?: string
  /** 默认超时时间（毫秒） */
  timeout?: number
  /** 默认请求头 */
  headers?: Record<string, string>
}
