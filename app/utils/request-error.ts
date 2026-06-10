import { RESPONSE_CODE } from '@/enums'

interface ResponseLike {
  code?: unknown
  msg?: unknown
}

function isResponseLike(value: unknown): value is ResponseLike {
  return typeof value === 'object' && value !== null && 'code' in value
}

export function isRequestErrorResponse(response: unknown): response is ResponseLike {
  return isResponseLike(response) && response.code !== RESPONSE_CODE.SUCCESS
}

export function isUnauthorizedResponse(response: unknown): boolean {
  return isResponseLike(response) && response.code === RESPONSE_CODE.UNAUTHORIZED
}

export function getResponseErrorMessage(response: unknown, fallback: string): string {
  if (isResponseLike(response) && typeof response.msg === 'string' && response.msg.trim()) {
    return response.msg
  }

  return fallback
}

export function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallback
}

export function shouldRedirectUnauthorized(response: unknown, hasToken: boolean, path: string): boolean {
  return isUnauthorizedResponse(response) && hasToken && !path.startsWith('/auth')
}
