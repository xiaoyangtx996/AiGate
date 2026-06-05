<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'

type SearchResult = {
  id: string
  name: string
  description?: string | null
  type: string
  url: string
}

const props = defineProps<{
  menuGroups?: CommandPaletteGroup<CommandPaletteItem>[]
}>()

const { t } = useI18n()
const { globalSearch } = useAigateApi()
const isOpen = ref(false)
const searchQuery = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)

const typeIcons: Record<string, string> = {
  Agent: 'lucide:bot',
  Prompt: 'lucide:file-text',
  Channel: 'lucide:server',
  'MCP Tool': 'lucide:wrench',
}

let timeout: ReturnType<typeof setTimeout> | undefined

watch(searchQuery, (newQuery) => {
  clearTimeout(timeout)
  if (newQuery.length < 2) {
    results.value = []
    return
  }

  timeout = setTimeout(async () => {
    loading.value = true
    try {
      const res = await globalSearch(newQuery)
      results.value = (res.data as SearchResult[]) || []
    }
    finally {
      loading.value = false
    }
  }, 300)
})

function close() {
  isOpen.value = false
  searchQuery.value = ''
  results.value = []
}

function onSelect() {
  close()
}

const groups = computed(() => {
  const paletteGroups: CommandPaletteGroup<CommandPaletteItem>[] = [...(props.menuGroups || [])]

  if (searchQuery.value.length >= 2) {
    paletteGroups.unshift({
      id: 'results',
      label: t('components.globalSearch.results'),
      ignoreFilter: true,
      items: results.value.map(r => ({
        id: `${r.type}-${r.id}`,
        label: r.name,
        description: r.description ? `${r.type} · ${r.description}` : r.type,
        icon: typeIcons[r.type] || 'lucide:search',
        onSelect: () => navigateTo(r.url),
      })),
    })
  }

  return paletteGroups
})

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => {
      isOpen.value = !isOpen.value
    },
  },
})

useRuntimeHook('dashboard:search:toggle', () => {
  isOpen.value = !isOpen.value
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    @update:open="(open) => !open && close()"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="searchQuery"
        :loading="loading"
        :groups="groups"
        :placeholder="t('components.globalSearch.placeholder')"
        :fuse="{ fuseOptions: { useTokenSearch: true } }"
        @update:model-value="onSelect"
      />
    </template>
  </UModal>
</template>
