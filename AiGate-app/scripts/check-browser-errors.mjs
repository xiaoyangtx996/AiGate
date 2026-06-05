import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const logs = []

page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) {
    logs.push(`${m.type()}: ${m.text()}`)
  }
})
page.on('pageerror', (e) => {
  logs.push(`PAGEERROR: ${e.message}`)
})

for (const url of ['http://localhost:5173/auth/sign-in', 'http://localhost:5173/auth/sign-up']) {
  logs.length = 0
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(2000)
  }
  catch (e) {
    logs.push(`NAV: ${e}`)
  }
  console.log(`\n=== ${url} ===`)
  console.log('title:', await page.title())
  console.log('final:', page.url())
  if (logs.length) {
    console.log('issues:')
    for (const l of logs) console.log(' ', l)
  }
  else {
    console.log('issues: none')
  }
}

await browser.close()
