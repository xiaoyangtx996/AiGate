import { toggleIdInSet } from '@/utils/batch'

export function useBatchOperations<T extends { id: string }>(options: { onDelete?: (items: T[]) => Promise<void> }) {
  const selectedIds = ref(new Set<string>())
  const confirm = useConfirmDialog()
  const { i18nCommon } = useMessage()
  const { successToast } = useAppToast()

  const selectedCount = computed(() => selectedIds.value.size)
  const hasSelection = computed(() => selectedIds.value.size > 0)

  function isSelected(id: string) {
    return selectedIds.value.has(id)
  }

  function toggleSelect(id: string) {
    selectedIds.value = toggleIdInSet(selectedIds.value, id)
  }

  function toggleSelectAll(ids: string[]) {
    if (ids.length > 0 && ids.every(id => selectedIds.value.has(id))) selectedIds.value = new Set()
    else selectedIds.value = new Set(ids)
  }

  function isAllSelected(ids: string[]) {
    return ids.length > 0 && ids.every(id => selectedIds.value.has(id))
  }

  function isSomeSelected(ids: string[]) {
    const count = ids.filter(id => selectedIds.value.has(id)).length
    return count > 0 && count < ids.length
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function getSelectedItems(allItems: T[]) {
    return allItems.filter(item => selectedIds.value.has(item.id))
  }

  async function batchDelete(allItems: T[]) {
    const items = getSelectedItems(allItems)
    if (items.length === 0) return

    const confirmed = await confirm({
      title: i18nCommon('confirmDeleteTitle'),
      description: i18nCommon('confirmDeleteDescription'),
      confirmLabel: i18nCommon('confirmDelete'),
      loadingLabel: i18nCommon('inDelete'),
      onConfirm: async () => {
        await options.onDelete?.(items)
        return true
      },
    })

    if (confirmed) {
      successToast(i18nCommon('deleteSuccess'))
      clearSelection()
    }
  }

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected,
    clearSelection,
    getSelectedItems,
    batchDelete,
  }
}
