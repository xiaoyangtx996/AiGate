import type { APIRequestContext, Page } from '@playwright/test'

async function getCookieHeader(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

function buildHeaders(cookieHeader: string, extra?: Record<string, string>) {
  return {
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...extra,
  }
}

export async function authenticatedRequest(page: Page, request: APIRequestContext) {
  const cookieHeader = await getCookieHeader(page)

  return {
    get(url: string, options?: { headers?: Record<string, string> }) {
      return request.get(url, {
        headers: buildHeaders(cookieHeader, options?.headers),
      })
    },
    post(url: string, options?: { data?: unknown; headers?: Record<string, string> }) {
      return request.post(url, {
        headers: buildHeaders(cookieHeader, {
          'Content-Type': 'application/json',
          ...options?.headers,
        }),
        data: options?.data,
      })
    },
    del(url: string, options?: { headers?: Record<string, string> }) {
      return request.delete(url, {
        headers: buildHeaders(cookieHeader, options?.headers),
      })
    },
  }
}
