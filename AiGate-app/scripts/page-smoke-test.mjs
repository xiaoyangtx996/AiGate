/**
 * AiGate page smoke test - checks HTTP status, redirects, and console errors
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const TEST_EMAIL = 'test@aigate.local'
const TEST_PASSWORD = 'Test123456'
const TEST_NAME = 'Test Admin'

const AUTH_PAGES = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/auth/magic-link',
]

const AIGATE_PAGES = [
  '/aigate/dashboard',
  '/aigate/dashboard/organization',
  '/aigate/agents',
  '/aigate/agents/chat',
  '/aigate/agents/create',
  '/aigate/channels',
  '/aigate/api-keys',
  '/aigate/api-logs',
  '/aigate/models',
  '/aigate/mcp-tools',
  '/aigate/mcp-tools/marketplace',
  '/aigate/mcp-tools/versions',
  '/aigate/knowledge-base',
  '/aigate/prompts',
  '/aigate/alerts',
  '/aigate/alerts/rules',
  '/aigate/billing',
  '/aigate/gateway',
  '/aigate/gateway/routes',
  '/aigate/organizations',
  '/aigate/members',
]

const OTHER_PAGES = [
  '/docs/api',
  '/hub/overview',
  '/hub/releases',
  '/playground/charts',
  '/playground/spinner',
  '/playground/qrcode',
  '/playground/lightbox',
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
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
      callbackURL: '/',
    }),
  })
  const text = await res.text()
  if (res.ok) return { ok: true, action: 'registered' }
  if (text.includes('already') || text.includes('exists') || res.status === 422) {
    return { ok: true, action: 'exists' }
  }
  return { ok: false, action: 'failed', status: res.status, body: text.slice(0, 300) }
}

async function testPage(page, path, expectAuth = false) {
  const consoleErrors = []
  const pageErrors = []

  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text()
      if (!t.includes('favicon') && !t.includes('404') && !t.includes('Hydration')) {
        consoleErrors.push(t.slice(0, 200))
      }
    }
  }
  const onPageError = (err) => pageErrors.push(err.message.slice(0, 200))

  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  let status = 200
  let note

  try {
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    status = response?.status() ?? 0
    await page.waitForTimeout(800)
  }
  catch (e) {
    status = 'error'
    pageErrors.push(String(e).slice(0, 200))
  }

  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  const finalUrl = page.url()
  let title = ''
  try {
    title = await page.title()
  }
  catch {
    title = '(navigation interrupted)'
  }
  const bodyText = await page.locator('body').innerText().catch(() => '')
  const hasContent = bodyText.trim().length > 50

  if (expectAuth && finalUrl.includes('/auth/sign-in')) {
    note = 'redirected to sign-in (auth required)'
  }
  if (status === 500) note = 'server error 500'
  if (!hasContent) note = (note ? `${note}; ` : '') + 'empty or minimal content'

  return {
    path,
    status,
    finalUrl: finalUrl.replace(BASE, ''),
    title,
    errors: pageErrors,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
    hasContent,
    note,
  }
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
  await page.goto(`${BASE}/aigate/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2000)
  return !page.url().includes('/auth/sign-in')
}

function formatResult(r) {
  const icon = (r.status === 500 || r.status === 'error' || (r.finalUrl.includes('/auth/sign-in') && r.path.startsWith('/aigate')))
    ? 'FAIL'
    : r.consoleErrors.length ? 'WARN' : 'OK'
  return `[${icon}] ${r.path} status=${r.status} url=${r.finalUrl} title="${r.title.slice(0, 40)}"${r.note ? ` (${r.note})` : ''}`
}

async function main() {
  console.log('Waiting for dev server...')
  if (!await waitForServer()) {
    console.error('Dev server not ready at', BASE)
    process.exitCode = 1
    return
  }

  const userResult = await ensureUser()
  console.log('User setup:', userResult)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const results = []

  console.log('\n=== Public auth pages ===')
  for (const path of AUTH_PAGES) {
    const r = await testPage(page, path)
    results.push(r)
    console.log(formatResult(r))
  }

  console.log('\n=== Login ===')
  const loggedIn = await login(page, context)
  console.log(loggedIn ? 'Login OK' : 'Login FAILED')

  if (loggedIn) {
    console.log('\n=== AiGate pages (authenticated) ===')
    for (const path of AIGATE_PAGES) {
      const r = await testPage(page, path, true)
      results.push(r)
      console.log(formatResult(r))
    }

    console.log('\n=== Other pages (authenticated) ===')
    for (const path of OTHER_PAGES) {
      const r = await testPage(page, path, true)
      results.push(r)
      console.log(formatResult(r))
    }
  }
  else {
    console.log('\nSkipping authenticated pages due to login failure')
    for (const path of [...AIGATE_PAGES, ...OTHER_PAGES]) {
      results.push({
        path,
        status: 'error',
        finalUrl: '/auth/sign-in',
        title: '',
        errors: ['login failed'],
        consoleErrors: [],
        hasContent: false,
        note: 'skipped - login failed',
      })
    }
  }

  await browser.close()

  const failed = results.filter(r =>
    r.status === 500
    || r.status === 'error'
    || r.errors.length > 0
    || (r.path.startsWith('/aigate') && r.finalUrl.includes('/auth/sign-in'))
    || !r.hasContent,
  )

  console.log('\n=== SUMMARY ===')
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`)

  const summary = [
    `# Page smoke test — ${new Date().toISOString()}`,
    `Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`,
    '',
    ...results.map(formatResult),
  ].join('\n')

  if (process.env.WRITE_RESULT !== '0') {
    const { writeFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const outPath = join(dirname(fileURLToPath(import.meta.url)), 'page-smoke-test-result-latest.txt')
    writeFileSync(outPath, summary, 'utf8')
    console.log(`\nWrote ${outPath}`)
  }

  if (failed.length) {
    console.log('\nFailed pages:')
    for (const f of failed) {
      console.log(`  ${f.path} -> status=${f.status} url=${f.finalUrl} ${f.note || ''}`)
      if (f.consoleErrors.length) console.log(`    console: ${f.consoleErrors[0]}`)
      if (f.errors.length) console.log(`    page: ${f.errors[0]}`)
    }
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
