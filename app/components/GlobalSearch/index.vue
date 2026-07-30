<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'

interface SearchResult {
  id: string
  title?: string
  name: string
  subtitle?: string | null
  description?: string | null
  type: string
  route?: string
  url?: string
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
  'User': 'lucide:user',
  'Organization': 'lucide:building-2',
  'API Key': 'lucide:key',
  'Agent': 'lucide:bot',
  'Prompt': 'lucide:file-text',
  'Channel': 'lucide:server',
  'Knowledge Base': 'lucide:database',
  'MCP Tool': 'lucide:wrench',
}

const typeLabels: Record<string, string> = {
  'User': 'Users',
  'Organization': 'Organizations',
  'API Key': 'API Keys',
  'Agent': 'Agents',
  'Prompt': 'Prompts',
  'Channel': 'Channels',
  'Knowledge Base': 'Knowledge Bases',
  'MCP Tool': 'MCP Tools',
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

function createSearchItem(r: SearchResult): CommandPaletteItem {
  const title = r.title || r.name
  const subtitle = r.subtitle ?? r.description
  return {
    id: `${r.type}-${r.id}`,
    label: title,
    description: subtitle ? `${r.type} - ${subtitle}` : r.type,
    icon: typeIcons[r.type] || 'lucide:search',
    onSelect: () => navigateTo(r.route || r.url || '/'),
  }
}

const groups = computed(() => {
  const paletteGroups: CommandPaletteGroup<CommandPaletteItem>[] = [...(props.menuGroups || [])]

  if (searchQuery.value.length >= 2) {
    const groupedResults = results.value.reduce<Record<string, SearchResult[]>>((acc, item) => {
      if (!acc[item.type])
        acc[item.type] = []
      acc[item.type]!.push(item)
      return acc
    }, {})

    paletteGroups.unshift(
      ...Object.entries(groupedResults).map(([type, items]) => ({
        id: `results-${type}`,
        label: typeLabels[type] || type || t('components.globalSearch.results'),
        ignoreFilter: true,
        items: items.map(createSearchItem),
      })),
    )
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
  ctrl_k: {
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
  <UModal v-model:open="isOpen" @update:open="open => !open && close()">
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
