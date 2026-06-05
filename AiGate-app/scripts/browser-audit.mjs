/**
 * Full browser audit: wait for dev server, login, visit all routes, record issues.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const TEST_EMAIL = 'test@aigate.local'
const TEST_PASSWORD = 'Test123456'
const TEST_NAME = 'Test Admin'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'browser-audit-result.txt')

const ROUTES = [
  ...['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password', '/auth/magic-link'],
  ...[
    '/aigate/dashboard', '/aigate/dashboard/organization', '/aigate/agents', '/aigate/agents/chat',
    '/aigate/agents/create', '/aigate/channels', '/aigate/api-keys', '/aigate/api-logs',
    '/aigate/models', '/aigate/mcp-tools', '/aigate/mcp-tools/marketplace', '/aigate/mcp-tools/versions',
    '/aigate/knowledge-base', '/aigate/prompts', '/aigate/alerts', '/aigate/alerts/rules',
    '/aigate/billing', '/aigate/gateway', '/aigate/gateway/routes', '/aigate/organizations', '/aigate/members',
  ],
  ...['/docs/api', '/hub/overview', '/hub/releases'],
]

async function waitForServer(maxMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/auth/sign-in`)
      if (res.ok) return true
    }
    catch { /* retry */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  return false
}

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  Origin: BASE,
  Referer: `${BASE}/auth/sign-up`,
}

async function ensureUser() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME, callbackURL: '/' }),
  })
  const text = await res.text()
  if (res.ok) return 'registered'
  if (text.includes('already') || text.includes('exists') || res.status === 422) return 'exists'
  return `failed:${res.status}:${text.slice(0, 120)}`
}

function isIgnorableConsole(text) {
  return /favicon|Hydration|404.*Not Found|DevTools|chunk.*failed|Not found 'components\.sidebarLogo\.version'/i.test(text)
}

async function auditPage(page, path, needsAuth) {
  const issues = []
  const consoleErrors = []
  const onConsole = (msg) => {
    if (msg.type() === 'error' && !isIgnorableConsole(msg.text())) {
      consoleErrors.push(msg.text().slice(0, 300))
    }
  }
  const onPageError = (err) => issues.push(`pageerror: ${err.message.slice(0, 200)}`)

  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  let status = 0
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      status = res?.status() ?? 0
      if (status < 500) break
      await page.waitForTimeout(1500)
    }
    await page.waitForTimeout(800)
  }
  catch (e) {
    issues.push(`nav: ${String(e).slice(0, 200)}`)
  }

  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  const finalUrl = page.url().replace(BASE, '')
  const title = await page.title().catch(() => '')
  const bodyLen = await page.locator('body').innerText().then(t => t.trim().length).catch(() => 0)

  if (status >= 500) issues.push(`http ${status}`)
  if (needsAuth && finalUrl.includes('/auth/sign-in')) issues.push('auth redirect')
  if (bodyLen < 30) issues.push('empty body')
  for (const c of [...new Set(consoleErrors)].slice(0, 3)) issues.push(`console: ${c}`)

  return { path, status, finalUrl, title: title.slice(0, 60), issues }
}

async function login(page, context) {
  const res = await context.request.post(`${BASE}/api/auth/sign-in/email`, {
    headers: { ...AUTH_HEADERS, Referer: `${BASE}/auth/sign-in` },
    data: { email: TEST_EMAIL, password: TEST_PASSWORD, callbackURL: '/' },
  })
  if (!res.ok()) {
    console.error('Login API:', res.status(), (await res.text()).slice(0, 200))
    return false
  }
  await page.goto(`${BASE}/aigate/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1000)
  return !page.url().includes('/auth/sign-in')
}

async function main() {
  console.log('Waiting for dev server...')
  if (!await waitForServer()) {
    console.error('Dev server not ready')
    process.exitCode = 1
    return
  }

  const user = await ensureUser()
  console.log('User:', user)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const results = []

  const publicRoutes = ROUTES.filter(p => p.startsWith('/auth') || p === '/docs/api')
  for (const path of publicRoutes) {
    const r = await auditPage(page, path, false)
    results.push(r)
    console.log(r.issues.length ? `FAIL ${path}` : `OK   ${path}`, r.issues.join(' | ') || '')
  }

  const loggedIn = await login(page, context)
  console.log('Login:', loggedIn ? 'OK' : 'FAIL')

  const authRoutes = ROUTES.filter(p => p.startsWith('/aigate') || p.startsWith('/hub'))
  for (const path of authRoutes) {
    const r = await auditPage(page, path, true)
    results.push(r)
    console.log(r.issues.length ? `FAIL ${path}` : `OK   ${path}`, r.issues.join(' | ') || '')
  }

  // Quick interaction checks
  const interactions = []
  try {
    await page.goto(`${BASE}/aigate/agents/create`, { waitUntil: 'domcontentloaded' })
    const nameInput = page.locator('input').first()
    if (await nameInput.count()) {
      await nameInput.fill('Audit Bot')
      interactions.push('agents/create form OK')
    }
    else interactions.push('agents/create: no input found')
  }
  catch (e) {
    interactions.push(`agents/create: ${e.message}`)
  }

  try {
    await page.goto(`${BASE}/aigate/prompts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const hasTable = await page.locator('table, [role="table"]').count()
    interactions.push(hasTable ? 'prompts list rendered' : 'prompts: no table')
  }
  catch (e) {
    interactions.push(`prompts: ${e.message}`)
  }

  await browser.close()

  const failed = results.filter(r => r.issues.length > 0)
  const lines = [
    `# Browser audit ${new Date().toISOString()}`,
    `User: ${user}, Login: ${loggedIn}`,
    `Total: ${results.length}, Failed: ${failed.length}`,
    '',
    '## Interactions',
    ...interactions.map(i => `- ${i}`),
    '',
    '## Failures',
    ...failed.map(f => `- ${f.path} -> ${f.finalUrl} [${f.status}] ${f.issues.join('; ')}`),
    '',
    '## All',
    ...results.map(r => `[${r.issues.length ? 'FAIL' : 'OK'}] ${r.path} status=${r.status} url=${r.finalUrl}`),
  ]
  writeFileSync(OUT, lines.join('\n'), 'utf8')
  console.log(`\nWrote ${OUT}`)
  console.log(`Summary: ${results.length - failed.length}/${results.length} OK, ${failed.length} issues`)

  if (failed.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
