import { describe, expect, it } from 'vitest'
import { defaultMenuSeeds } from '../default-menus'

describe('defaultMenuSeeds structure', () => {
  const ids = new Set(defaultMenuSeeds.map(menu => menu.id))

  it('should contain unique menu ids', () => {
    expect(ids.size).toBe(defaultMenuSeeds.length)
  })

  it('should reference valid parent ids for child menus', () => {
    const orphans = defaultMenuSeeds.filter(
      menu => menu.parentId && !ids.has(menu.parentId),
    )
    expect(orphans).toEqual([])
  })

  it('should have root menus without parentId', () => {
    const roots = defaultMenuSeeds.filter(menu => !menu.parentId)
    expect(roots.length).toBeGreaterThan(0)
    expect(roots.every(menu => menu.sort !== undefined)).toBe(true)
  })

  it('should use absolute paths for routable menu items', () => {
    const routable = defaultMenuSeeds.filter(menu => menu.to)
    expect(routable.every(menu => menu.to!.startsWith('/'))).toBe(true)
  })

  it('should include API docs entry under hub section', () => {
    const apiDocs = defaultMenuSeeds.find(menu => menu.to === '/docs/api')
    expect(apiDocs).toBeDefined()
    expect(apiDocs?.parentId).toBe('menu-hub')
    expect(apiDocs?.enabled).toBe(true)
  })

  it('should keep child menus sorted within each parent', () => {
    const byParent = new Map<string | null | undefined, number[]>()

    for (const menu of defaultMenuSeeds) {
      const sorts = byParent.get(menu.parentId) ?? []
      sorts.push(menu.sort ?? 0)
      byParent.set(menu.parentId, sorts)
    }

    for (const [, sorts] of byParent) {
      const sorted = [...sorts].sort((a, b) => a - b)
      expect(sorts).toEqual(sorted)
    }
  })
})
