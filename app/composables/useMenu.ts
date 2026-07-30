import type { NavigationMenuItem } from '@nuxt/ui'

export function useMenu() {
  const menuStore = useMenuStore()
  const { t } = useI18n()

  function toNavItems(items: MenuTree[]): NavigationMenuItem[] {
    return items.map((item) => {
      const children = item.children?.length ? toNavItems(item.children) : undefined

      return {
        label: item.label ? t(item.label) : item.label,
        to: item.to ?? undefined,
        icon: item.icon ?? undefined,
        defaultOpen: item.defaultOpen ?? undefined,
        ...(children ? { children } : {}),
      }
    })
  }

  const menuItems = computed(() => toNavItems(menuStore.menuTree ?? []))

  return {
    menuItems,
  }
}
