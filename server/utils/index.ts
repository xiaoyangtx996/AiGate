import type { H3Event } from 'h3'
import { RESPONSE_CODE } from '@/enums'

interface ErrorLike {
  statusCode?: unknown
  status?: unknown
  code?: unknown
  statusMessage?: unknown
  message?: unknown
  data?: unknown
  name?: unknown
  issues?: unknown
}

interface ErrorResponseOptions {
  event?: H3Event
  statusCode?: number
  expose?: boolean
}

const DEFAULT_ERROR_MESSAGE = '未知错误'
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: RESPONSE_CODE.label(RESPONSE_CODE.BAD_REQUEST),
  401: RESPONSE_CODE.label(RESPONSE_CODE.UNAUTHORIZED),
  403: RESPONSE_CODE.label(RESPONSE_CODE.FORBIDDEN),
  404: RESPONSE_CODE.label(RESPONSE_CODE.NOT_FOUND),
  409: RESPONSE_CODE.label(RESPONSE_CODE.CONFLICT),
  429: '请求过于频繁',
  500: RESPONSE_CODE.label(RESPONSE_CODE.SERVER_ERROR),
  502: '上游服务错误',
  503: '服务暂不可用',
}

function isHttpStatus(value: unknown): value is number {
  return typeof value === 'number' && value >= 400 && value <= 599
}

function toErrorLike(err: unknown): ErrorLike {
  return typeof err === 'object' && err !== null ? (err as ErrorLike) : {}
}

function isValidationError(error: ErrorLike) {
  return error.name === 'ValidationError' || error.name === 'ZodError' || Array.isArray(error.issues)
}

function getErrorStatusCode(err: unknown, fallback = RESPONSE_CODE.SERVER_ERROR): number {
  const error = toErrorLike(err)

  if (isHttpStatus(error.statusCode)) return error.statusCode
  if (isHttpStatus(error.status)) return error.status
  if (isHttpStatus(error.code)) return error.code
  if (isValidationError(error)) return RESPONSE_CODE.BAD_REQUEST
  if (error.code === RESPONSE_CODE.UNIQUE_VIOLATION) return RESPONSE_CODE.CONFLICT

  return fallback
}

function getErrorMessage(err: unknown, fallback = DEFAULT_ERROR_MESSAGE) {
  if (typeof err === 'string') return err

  const error = toErrorLike(err)
  if (typeof error.statusMessage === 'string' && error.statusMessage) return error.statusMessage
  if (typeof error.message === 'string' && error.message) return error.message

  return fallback
}

function getStatusMessage(statusCode: number) {
  return HTTP_ERROR_MESSAGES[statusCode] ?? DEFAULT_ERROR_MESSAGE
}

function getErrorData(err: unknown) {
  const error = toErrorLike(err)

  if (Array.isArray(error.issues)) return error.issues
  if (isHttpStatus(error.statusCode) && error.data !== undefined) return error.data
  if (err !== null && err !== undefined) return err

  return null
}

function tryUseEvent() {
  try {
    return useEvent()
  } catch {
    return undefined
  }
}

function applyResponseStatus(statusCode: number, event?: H3Event) {
  const targetEvent = event ?? tryUseEvent()
  if (!targetEvent) return

  setResponseStatus(targetEvent, statusCode)
}

function shouldExposeMessage(statusCode: number, expose?: boolean) {
  if (expose !== undefined) return expose
  return process.env.NODE_ENV !== 'production' || statusCode < 500
}

/**
 * @description: 请求成功
 */
export function responseSuccess<T>(
  data: T,
  msg = RESPONSE_CODE.label(RESPONSE_CODE.SUCCESS),
  code: typeof RESPONSE_CODE.valueType = RESPONSE_CODE.SUCCESS,
): IResponse<T> {
  return { data, msg, code, timestamp: Date.now() }
}

/**
 * @description: 请求失败
 */
export function responseError(data: unknown = null, msg?: string, options: ErrorResponseOptions = {}): IResponse {
  const isExplicitMessage = typeof msg === 'string'
  const statusCode =
    options.statusCode ??
    (isExplicitMessage && msg === 'Validation failed' ? RESPONSE_CODE.BAD_REQUEST : getErrorStatusCode(data))
  const message = isExplicitMessage ? msg : getErrorMessage(data, getStatusMessage(statusCode))

  applyResponseStatus(statusCode, options.event)

  return {
    data: isExplicitMessage ? data : getErrorData(data),
    msg: shouldExposeMessage(statusCode, options.expose) ? message : RESPONSE_CODE.label(RESPONSE_CODE.SERVER_ERROR),
    code: statusCode as typeof RESPONSE_CODE.valueType,
    timestamp: Date.now(),
  }
}

/**
 * @description: 统一处理 catch 错误
 */
export function catchError(err: unknown): IResponse {
  return responseError(getErrorData(err), getErrorMessage(err), { statusCode: getErrorStatusCode(err) })
}

type TreeNode<T> = T & { children?: TreeNode<T>[] }

export function convertFlatDataToTree<T extends { id: any; parentId?: any }>(
  flatData: T[],
  rootId?: any,
): TreeNode<T>[] {
  const map: Record<any, TreeNode<T>> = {}
  const roots: TreeNode<T>[] = []

  flatData.forEach(node => {
    map[node.id] = { ...node } as TreeNode<T>
  })

  flatData.forEach(node => {
    const parentNode = map[node.parentId ?? rootId]
    if (parentNode) {
      let children = parentNode.children
      if (!children) {
        children = []
        Object.assign(parentNode, { children })
      }
      children.push(map[node.id] as TreeNode<T>)
    } else {
      roots.push(map[node.id] as TreeNode<T>)
    }
  })

  const cleanUpEmptyChildren = (nodes: TreeNode<T>[]): TreeNode<T>[] =>
    nodes.map(node => ({
      ...node,
      children: node.children && node.children.length > 0 ? cleanUpEmptyChildren(node.children) : undefined,
    }))

  return cleanUpEmptyChildren(roots)
}

export function transformToLangTree(nodes: InternalizationTree[]) {
  const result: Record<Locale, any> = {
    en: {},
    'zh-CN': {},
  }

  function traverse(nodeList: InternalizationTree[], enTarget: any, zhTarget: any) {
    for (const node of nodeList) {
      if (node.children && node.children.length) {
        enTarget[node.name] = enTarget[node.name] || {}
        zhTarget[node.name] = zhTarget[node.name] || {}
        traverse(node.children, enTarget[node.name], zhTarget[node.name])
      } else {
        if (node.en) enTarget[node.name] = node.en
        if (node.zh) zhTarget[node.name] = node.zh
      }
    }
  }

  traverse(nodes, result.en, result['zh-CN'])
  return result
}
