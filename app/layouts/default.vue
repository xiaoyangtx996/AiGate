<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'
import pkg from '~~/package.json'
import { useMenuStore } from '@/stores/useMenuStore'
import { useTabStore } from '@/stores/useTabStore'

const config = useRuntimeConfig()
const menuStore = useMenuStore()
const tabStore = useTabStore()
const { getMenuList } = useSystemApi()

const open = ref(false)
const botOpen = ref(false)
const isMac = ref(false)
const route = useRoute()
const { menuItems } = useMenu()
const { user } = useCurrentUser()
const appScrollContainer = useAppScrollContainer()

const GlobalSearch = defineAsyncComponent(() => import('@/components/GlobalSearch/index.vue'))
const AigateBotDrawer = defineAsyncComponent(() => import('@/components/AigateBotDrawer.vue'))

const skeletonWidths = ['w-[70%]', 'w-[75%]', 'w-[80%]', 'w-[85%]', 'w-[90%]', 'w-[72%]']
const applePlatformPattern = /Mac|iPhone|iPad|iPod/

const title = computed(() => {
  if (!menuStore.menuPathMap) {
    return ''
  }
  const menu = menuStore.menuPathMap.get(route.path)
  return menu?.label ? $t(menu.label) : ''
})

const groups = computed(
  () =>
    [
      {
        id: 'searchMenu',
        label: $t('layout.searchMenu'),
        items: menuItems.value,
      },
      {
        id: 'friendLink',
        label: $t('layout.friendLink'),
        items: [
          {
            label: $t('layout.github'),
            icon: 'simple-icons:github',
            to: pkg.git?.url ?? 'https://github.com',
            target: '_blank',
          },
          {
            label: $t('layout.blog'),
            icon: 'lucide:house',
            to: 'https://baiwumm.com',
            target: '_blank',
          },
        ],
      },
    ] as CommandPaletteGroup<CommandPaletteItem>[],
)

function syncTabFromRoute() {
  if (!menuStore.menuTree?.length)
    return

  const path = route.path

  tabStore.setActive(path)

  if (path === '/')
    return

  const menu = menuStore.menuPathMap.get(path)

  if (!menu)
    return

  if (tabStore.ignoreNextAdd) {
    tabStore.ignoreNextAdd = false
    return
  }

  tabStore.addTag(menu)
}

watch(
  () => [route.path, menuStore.menuTree],
  syncTabFromRoute,
)

useHead({
  titleTemplate: computed(() => {
    return title.value ? `${title.value} - ${config.public.appName}` : config.public.appName
  }),
})

function applyMenuTree(tree: MenuTree[] | null | undefined) {
  if (!tree?.length)
    return

  menuStore.menuTree = tree
  menuStore.inited = true
  menuStore.loading = false
}

const { data: menuTreeData } = await useAsyncData('menu-tree-init', async () => {
  menuStore.loading = true
  try {
    const res = await getMenuList({ enabled: true })
    return res.data ?? []
  }
  catch {
    return []
  }
  finally {
    menuStore.loading = false
  }
})

watch(menuTreeData, applyMenuTree, { immediate: true })

watch(
  () => user.value?.id,
  () => {
    if (user.value && !menuStore.menuTree.length)
      void menuStore.fetchMenuTree()
  },
  { immediate: true },
)

onMounted(() => {
  if (!menuStore.menuTree.length)
    void menuStore.fetchMenuTree()

  syncTabFromRoute()
  appScrollContainer.value = document.querySelector('.app-scroll-container')
  isMac.value = applePlatformPattern.test(navigator.platform)
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <SidebarLogo :collapsed />
      </template>

      <template #default="{ collapsed }">
        <div class="flex items-center gap-1.5">
          <UDashboardSearchButton :collapsed class="bg-transparent ring-default flex-1" />
          <div v-if="!collapsed" class="flex shrink-0 items-center gap-0.5 pointer-events-none">
            <ClientOnly>
              <UKbd>{{ isMac ? '⌘' : 'Ctrl' }}</UKbd>
              <template #fallback>
                <UKbd>Ctrl</UKbd>
              </template>
            </ClientOnly>
            <UKbd>K</UKbd>
          </div>
        </div>

        <div v-if="menuStore.loading" class="grid gap-2">
          <USkeleton v-for="(width, index) in skeletonWidths" :key="index" class="h-4" :class="width" />
        </div>

        <UNavigationMenu
          v-else
          :collapsed
          :items="menuItems as NavigationMenuItem[]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu :collapsed :items="groups[1]?.items" orientation="vertical" tooltip class="mt-auto" />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <ClientOnly>
      <GlobalSearch :menu-groups="groups" />
    </ClientOnly>
    <UDashboardPanel id="app-container" :ui="{ body: 'app-scroll-container' }">
      <template #header>
        <UDashboardNavbar>
          <template #title>
            <span class="block">{{ title }}</span>
          </template>
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <div class="flex items-center gap-2">
              <OrganizationSwitcher />
              <UButton icon="lucide:bot" variant="ghost" @click="botOpen = true" />
              <ThemePresetSelector />
              <FullScreen />
              <ThemePicker />
            </div>
          </template>
        </UDashboardNavbar>
        <UDashboardToolbar>
          <MultipleTabs />
        </UDashboardToolbar>
      </template>
      <template #body>
        <ErrorBoundary>
          <slot />
        </ErrorBoundary>
        <BackTop />
        <ClientOnly>
          <AigateBotDrawer v-model:open="botOpen" />
        </ClientOnly>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
