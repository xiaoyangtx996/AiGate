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
  '/aigate/billing',
  '/aigate/organizations',
  '/aigate/members',
]

const OTHER_PAGES = [
  '/hub/overview',
  '/hub/releases',
  '/playground/charts',
  '/playground/spinner',
  '/playground/qrcode',
  '/playground/lightbox',
]

async function ensureUser() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const title = await page.title()
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

async function login(page) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle', timeout: 60000 })
  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 15000 })
  await emailInput.fill(TEST_EMAIL)
  await passwordInput.fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /登录|Sign in/i }).click()
  await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'), { timeout: 30000 }).catch(() => {})
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
  const loggedIn = await login(page)
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
