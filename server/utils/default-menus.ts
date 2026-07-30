import type { InferInsertModel } from 'drizzle-orm'
import type { menu } from '@/db/schema'
import { PERMISSIONS } from '@/enums'

type MenuSeed = InferInsertModel<typeof menu>
type PermissionValue = typeof PERMISSIONS.valueType

function permissionBits(...permissions: PermissionValue[]) {
  return permissions.reduce((bits, permission) => bits | PERMISSIONS.raw(permission).bits, 0)
}

export const defaultMenuSeeds: MenuSeed[] = [
  // ==================== 工作台 ====================
  {
    id: 'menu-workspace',
    label: 'menu.workspace',
    icon: 'lucide:layout-dashboard',
    sort: 10,
    defaultOpen: true,
    enabled: true,
    keepAlive: false,
    permissions: 0,
  },
  {
    id: 'menu-workspace-my',
    label: 'menu.myWorkbench',
    icon: 'lucide:user-round-check',
    to: '/aigate/my-workbench',
    parentId: 'menu-workspace',
    sort: 0,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-workspace-dashboard',
    label: 'menu.dashboard',
    icon: 'lucide:gauge',
    to: '/aigate/dashboard',
    parentId: 'menu-workspace',
    sort: 1,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-workspace-organization-dashboard',
    label: 'menu.organizationDashboard',
    icon: 'lucide:building-2',
    to: '/aigate/dashboard/organization',
    parentId: 'menu-workspace',
    sort: 2,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT'),
  },
  {
    id: 'menu-workspace-quota-requests',
    label: 'menu.quotaRequests',
    icon: 'lucide:send',
    to: '/aigate/quota-requests',
    parentId: 'menu-workspace',
    sort: 2,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('EDIT'),
  },
  {
    id: 'menu-workspace-my-api-logs',
    label: 'menu.myApiLogs',
    icon: 'lucide:scroll-text',
    to: '/aigate/my-api-logs',
    parentId: 'menu-workspace',
    sort: 3,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-workspace-my-api-keys',
    label: 'menu.myApiKeys',
    icon: 'lucide:key-round',
    to: '/aigate/my-api-keys',
    parentId: 'menu-workspace',
    sort: 4,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },

  // ==================== AI 资产管理 ====================
  {
    id: 'menu-assets',
    label: 'menu.aiAssets',
    icon: 'lucide:package',
    sort: 20,
    defaultOpen: true,
    enabled: true,
    keepAlive: false,
    permissions: 0,
  },
  {
    id: 'menu-assets-agents',
    label: 'menu.agents',
    icon: 'lucide:bot',
    to: '/aigate/agents',
    parentId: 'menu-assets',
    sort: 1,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT', 'DELETE', 'BATCH_DELETE'),
  },
  {
    id: 'menu-assets-prompts',
    label: 'menu.prompts',
    icon: 'lucide:message-square-text',
    to: '/aigate/prompts',
    parentId: 'menu-assets',
    sort: 2,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('SEARCH', 'ADD', 'EDIT', 'DELETE', 'BATCH_DELETE'),
  },
  {
    id: 'menu-assets-mcp',
    label: 'menu.mcpTools',
    icon: 'lucide:wrench',
    to: '/aigate/mcp-tools',
    parentId: 'menu-assets',
    sort: 3,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT', 'DELETE'),
  },
  {
    id: 'menu-assets-kb',
    label: 'menu.knowledgeBase',
    icon: 'lucide:library-big',
    to: '/aigate/knowledge-base',
    parentId: 'menu-assets',
    sort: 4,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT', 'DELETE'),
  },
  {
    id: 'menu-assets-skills',
    label: 'menu.skills',
    icon: 'lucide:sparkles',
    to: '/aigate/skills',
    parentId: 'menu-assets',
    sort: 5,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT', 'DELETE'),
  },
  {
    id: 'menu-assets-mcp-marketplace',
    label: 'menu.mcpMarketplace',
    icon: 'lucide:store',
    to: '/aigate/mcp-tools/marketplace',
    parentId: 'menu-assets',
    sort: 6,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD'),
  },
  {
    id: 'menu-assets-mcp-versions',
    label: 'menu.mcpVersions',
    icon: 'lucide:git-branch',
    to: '/aigate/mcp-tools/versions',
    parentId: 'menu-assets',
    sort: 7,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT'),
  },

  // ==================== 网关配置 ====================
  {
    id: 'menu-gateway',
    label: 'menu.gateway',
    icon: 'lucide:network',
    sort: 30,
    defaultOpen: false,
    enabled: true,
    keepAlive: false,
    permissions: 0,
  },
  {
    id: 'menu-gateway-overview',
    label: 'menu.gatewayOverview',
    icon: 'lucide:activity',
    to: '/aigate/gateway',
    parentId: 'menu-gateway',
    sort: 0,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-gateway-models',
    label: 'menu.models',
    icon: 'lucide:boxes',
    to: '/aigate/models',
    parentId: 'menu-gateway',
    sort: 1,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-gateway-channels',
    label: 'menu.channels',
    icon: 'lucide:route',
    to: '/aigate/channels',
    parentId: 'menu-gateway',
    sort: 2,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT', 'DELETE'),
  },
  {
    id: 'menu-gateway-keys',
    label: 'menu.apiKeys',
    icon: 'lucide:key-round',
    to: '/aigate/api-keys',
    parentId: 'menu-gateway',
    sort: 3,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('SEARCH', 'ADD', 'EDIT', 'DELETE', 'BATCH_DELETE'),
  },
  {
    id: 'menu-gateway-routes',
    label: 'menu.gatewayRoutes',
    icon: 'lucide:route',
    to: '/aigate/gateway/routes',
    parentId: 'menu-gateway',
    sort: 4,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-gateway-combos',
    label: 'menu.gatewayCombos',
    icon: 'lucide:git-branch',
    to: '/aigate/gateway/combos',
    parentId: 'menu-gateway',
    sort: 5,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT', 'DELETE'),
  },

  // ==================== 运营中心 ====================
  {
    id: 'menu-ops',
    label: 'menu.operations',
    icon: 'lucide:activity',
    sort: 40,
    defaultOpen: false,
    enabled: true,
    keepAlive: false,
    permissions: 0,
  },
  {
    id: 'menu-ops-billing',
    label: 'menu.billing',
    icon: 'lucide:receipt',
    to: '/aigate/billing',
    parentId: 'menu-ops',
    sort: 1,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-ops-logs',
    label: 'menu.apiLogs',
    icon: 'lucide:scroll-text',
    to: '/aigate/api-logs',
    parentId: 'menu-ops',
    sort: 2,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-ops-alerts',
    label: 'menu.alerts',
    icon: 'lucide:bell',
    to: '/aigate/alerts',
    parentId: 'menu-ops',
    sort: 3,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },

  // ==================== 系统设置 ====================
  {
    id: 'menu-settings',
    label: 'menu.systemSettings',
    icon: 'lucide:settings',
    sort: 90,
    defaultOpen: false,
    enabled: true,
    keepAlive: false,
    permissions: 0,
  },
  {
    id: 'menu-settings-users',
    label: 'menu.userManage',
    icon: 'lucide:user-cog',
    to: '/system-settings/user-manage',
    parentId: 'menu-settings',
    sort: 1,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-settings-roles',
    label: 'menu.roleManage',
    icon: 'lucide:shield',
    to: '/system-settings/role-manage',
    parentId: 'menu-settings',
    sort: 2,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-settings-menus',
    label: 'menu.menuManage',
    icon: 'lucide:menu',
    to: '/system-settings/menu-manage',
    parentId: 'menu-settings',
    sort: 3,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-settings-org',
    label: 'menu.orgStructure',
    icon: 'lucide:building-2',
    to: '/aigate/organizations',
    parentId: 'menu-settings',
    sort: 4,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-settings-tenant-packages',
    label: 'menu.tenantPackages',
    icon: 'lucide:package-check',
    to: '/system-settings/tenant-packages',
    parentId: 'menu-settings',
    sort: 5,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'EDIT', 'DELETE'),
  },
  {
    id: 'menu-settings-center',
    label: 'menu.settingsCenter',
    icon: 'lucide:settings-2',
    to: '/system-settings/settings',
    parentId: 'menu-settings',
    sort: 6,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('EDIT'),
  },
  {
    id: 'menu-settings-i18n',
    label: 'menu.i18n',
    icon: 'lucide:languages',
    to: '/system-settings/internalization',
    parentId: 'menu-settings',
    sort: 7,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-settings-logs',
    label: 'menu.operationLog',
    icon: 'lucide:history',
    to: '/system-settings/operation-log',
    parentId: 'menu-settings',
    sort: 8,
    enabled: true,
    keepAlive: true,
    permissions: 0,
  },
  {
    id: 'menu-settings-members',
    label: 'menu.members',
    icon: 'lucide:users',
    to: '/aigate/members',
    parentId: 'menu-settings',
    sort: 8,
    enabled: true,
    keepAlive: true,
    permissions: permissionBits('ADD', 'DELETE'),
  },

  // ==================== 开发者文档 ====================
  {
    id: 'menu-api-docs',
    label: 'menu.apiDocs',
    icon: 'lucide:book-open-text',
    to: '/docs/api',
    sort: 100,
    enabled: true,
    keepAlive: false,
    permissions: 0,
  },
]

export async function seedDefaultMenus(db: typeof import('@/db/drizzle').db) {
  const { and, count, eq } = await import('drizzle-orm')
  const { menu, role, roleMenu } = await import('@/db/schema')

  const menuSeeds = defaultMenuSeeds.map(seed => ({ ...seed, code: seed.code ?? seed.id ?? seed.label }))
  const [{ value = 0 } = {}] = await db.select({ value: count() }).from(menu)
  if (value === 0) {
    await db.insert(menu).values(menuSeeds)
  }
  else {
    const existingMenus = await db.select({ id: menu.id }).from(menu)
    const existingIds = new Set(existingMenus.map(item => item.id))
    const missingMenus = menuSeeds.filter(seed => seed.id && !existingIds.has(seed.id))

    if (missingMenus.length > 0) {
      await db.insert(menu).values(missingMenus)
    }
  }

  const menusWithPermissions = menuSeeds.filter(seed => seed.id && seed.permissions && seed.permissions > 0)
  for (const seed of menusWithPermissions) {
    await db
      .update(menu)
      .set({ permissions: seed.permissions })
      .where(and(eq(menu.id, seed.id!), eq(menu.permissions, 0)))
  }

  const adminRoles = await db.select({ id: role.id }).from(role).where(eq(role.code, 'admin'))
  if (adminRoles.length > 0) {
    const adminMenuRows = menuSeeds
      .filter(seed => seed.id)
      .flatMap(seed =>
        adminRoles.map(adminRole => ({
          roleId: adminRole.id,
          menuId: seed.id!,
          permissions: seed.permissions ?? 0,
        })),
      )

    if (adminMenuRows.length > 0) {
      await db.insert(roleMenu).values(adminMenuRows).onConflictDoNothing()
    }
  }

  return { seeded: value === 0, count: value || defaultMenuSeeds.length, backfilled: menusWithPermissions.length }
}
