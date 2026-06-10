import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '../..')
const PAGES_DIR = join(ROOT, 'app', 'pages')
const SMOKE_SCRIPT = join(ROOT, 'scripts', 'page-smoke-test.mjs')

function discoverAigateStaticRoutes(dir: string, routePrefix: string): string[] {
  const routes: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'components' || entry.name.startsWith('[')) continue

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      routes.push(...discoverAigateStaticRoutes(fullPath, `${routePrefix}/${entry.name}`))
      continue
    }

    if (!entry.name.endsWith('.vue')) continue

    const base = entry.name.replace(/\.vue$/, '')
    if (base.startsWith('[')) continue

    routes.push(base === 'index' ? routePrefix : `${routePrefix}/${base}`)
  }

  return routes
}

function parseSmokeTestRoutes(scriptPath: string, arrayName: string): string[] {
  const source = readFileSync(scriptPath, 'utf8')
  const match = source.match(new RegExp(`const ${arrayName} = \\[([\\s\\S]*?)\\]`))
  if (!match) throw new Error(`Could not find ${arrayName} in ${scriptPath}`)

  return Array.from(match[1]!.matchAll(/'([^']+)'/g), m => m[1]!)
}

describe('page smoke test routes', () => {
  it('includes every static /aigate page from app/pages', () => {
    const discovered = discoverAigateStaticRoutes(join(PAGES_DIR, 'aigate'), '/aigate').sort()
    const configured = parseSmokeTestRoutes(SMOKE_SCRIPT, 'AIGATE_PAGES').sort()

    expect(configured).toEqual(expect.arrayContaining(discovered))
    expect(configured.length).toBeGreaterThanOrEqual(discovered.length)
  })

  it('lists unique routes across all page groups', () => {
    const auth = parseSmokeTestRoutes(SMOKE_SCRIPT, 'AUTH_PAGES')
    const aigate = parseSmokeTestRoutes(SMOKE_SCRIPT, 'AIGATE_PAGES')
    const other = parseSmokeTestRoutes(SMOKE_SCRIPT, 'OTHER_PAGES')
    const all = [...auth, ...aigate, ...other]

    expect(new Set(all).size).toBe(all.length)
  })
})
