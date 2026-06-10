import { describe, expect, it } from 'vitest'
import { defaultMenuSeeds } from '#server/utils/default-menus'
import { PERMISSIONS } from '@/enums'
import { canUseMenuPermission, hasPermissionBit } from '@/utils/ui-authorization'

const agentMenu = {
  to: '/aigate/agents',
  permissions: PERMISSIONS.raw(PERMISSIONS.ADD).bits
    | PERMISSIONS.raw(PERMISSIONS.EDIT).bits
    | PERMISSIONS.raw(PERMISSIONS.DELETE).bits,
}

const promptMenu = {
  to: '/aigate/prompts',
  permissions: PERMISSIONS.raw(PERMISSIONS.SEARCH).bits,
}

const menuTree = [
  {
    to: '/aigate',
    permissions: 0,
    children: [agentMenu, promptMenu],
  },
]

describe('ui authorization', () => {
  it('allows visible menu paths', () => {
    expect(canUseMenuPermission(menuTree, { path: '/aigate/agents' })).toBe(true)
  })

  it('rejects paths outside the authorized menu tree', () => {
    expect(canUseMenuPermission(menuTree, { path: '/aigate/channels' })).toBe(false)
  })

  it('checks a single permission bit', () => {
    expect(canUseMenuPermission(menuTree, { path: '/aigate/agents', permission: 'EDIT' })).toBe(true)
    expect(canUseMenuPermission(menuTree, { path: '/aigate/prompts', permission: 'EDIT' })).toBe(false)
  })

  it('inherits permissions from the nearest menu path for child pages', () => {
    expect(canUseMenuPermission(menuTree, { path: '/aigate/agents/agent-1', permission: 'EDIT' })).toBe(true)
    expect(canUseMenuPermission(menuTree, { path: '/aigate/prompts/prompt-1', permission: 'EDIT' })).toBe(false)
  })

  it('supports anyOf and allOf permission checks', () => {
    expect(canUseMenuPermission(menuTree, { path: '/aigate/agents', anyOf: ['ADD', 'BATCH_DELETE'] })).toBe(true)
    expect(canUseMenuPermission(menuTree, { path: '/aigate/agents', allOf: ['ADD', 'DELETE'] })).toBe(true)
    expect(canUseMenuPermission(menuTree, { path: '/aigate/agents', allOf: ['ADD', 'BATCH_DELETE'] })).toBe(false)
  })

  it('matches permission bits directly', () => {
    const bits = PERMISSIONS.raw(PERMISSIONS.DELETE).bits
    expect(hasPermissionBit(bits, 'DELETE')).toBe(true)
    expect(hasPermissionBit(bits, 'EDIT')).toBe(false)
  })

  it('seeds actionable AiGate menus with permission bits', () => {
    const permissionsByPath = new Map(defaultMenuSeeds.map(item => [item.to, item.permissions ?? 0]))

    expect(permissionsByPath.get('/aigate/agents')).toBeGreaterThan(0)
    expect(permissionsByPath.get('/aigate/prompts')).toBeGreaterThan(0)
    expect(permissionsByPath.get('/aigate/mcp-tools')).toBeGreaterThan(0)
    expect(permissionsByPath.get('/aigate/knowledge-base')).toBeGreaterThan(0)
    expect(permissionsByPath.get('/aigate/channels')).toBeGreaterThan(0)
    expect(permissionsByPath.get('/aigate/api-keys')).toBeGreaterThan(0)
    expect(permissionsByPath.get('/aigate/quota-requests')).toBeGreaterThan(0)
  })
})
