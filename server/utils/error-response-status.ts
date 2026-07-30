function isErrorResponse(body: unknown): body is IResponse {
  return typeof body === 'object' && body !== null && 'code' in body && 'msg' in body && 'timestamp' in body
}

export function syncErrorResponseStatus(
  event: import('h3').H3Event,
  response: { body?: unknown } | undefined,
) {
  if (!response || !isErrorResponse(response.body))
    return

  const code = response.body.code
  if (typeof code === 'number' && code >= 400 && code <= 599) {
    setResponseStatus(event, code)
  }
}
