import { reactive } from 'vue'

type Claims = { tenant_id?: string; sub?: string; roles?: string[]; platform?: boolean; display_name?: string; exp?: number }

const savedToken = localStorage.getItem('aigate_token') || ''

export const session = reactive({
  token: savedToken,
  claims: decodeClaims(savedToken),
})

export function setSession(token: string) {
  session.token = token
  session.claims = decodeClaims(token)
  localStorage.setItem('aigate_token', token)
}

export function clearSession() {
  session.token = ''
  session.claims = {}
  localStorage.removeItem('aigate_token')
}

export function isAuthenticated() {
  return Boolean(session.token && (!session.claims.exp || session.claims.exp * 1000 > Date.now()))
}

function decodeClaims(token: string): Claims {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(normalized)))) as Claims
  } catch {
    return {}
  }
}
