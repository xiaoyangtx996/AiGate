<script setup lang="ts">
interface OpenApiOperation {
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  security?: unknown[]
}

interface OpenApiSpec {
  info?: {
    title?: string
    version?: string
    description?: string
  }
  paths?: Record<string, Record<string, OpenApiOperation>>
}

interface ApiOperationRow {
  path: string
  method: string
  summary: string
  description: string
  tags: string[]
  operationId: string
  secured: boolean
}

const specUrl = '/api/openapi'
const { t } = useI18n()
const p = (key: string) => t(`pages.docs.api.${key}`)

const search = ref('')
const selectedMethod = ref('all')
const selectedTag = ref('all')

const { data: spec, pending, error, refresh } = await useFetch<OpenApiSpec>(specUrl)

const operations = computed<ApiOperationRow[]>(() => {
  const paths = spec.value?.paths ?? {}

  return Object.entries(paths)
    .flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, operation]) => ({
        path,
        method: method.toUpperCase(),
        summary: operation.summary ?? '',
        description: operation.description ?? '',
        tags: operation.tags ?? [],
        operationId: operation.operationId ?? '',
        secured: !!operation.security?.length,
      })),
    )
    .sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`))
})

const methodOptions = computed(() => [
  { label: 'All', value: 'all' },
  ...Array.from(new Set(operations.value.map(item => item.method)))
    .sort()
    .map(method => ({ label: method, value: method })),
])

const tagOptions = computed(() => [
  { label: 'All', value: 'all' },
  ...Array.from(new Set(operations.value.flatMap(item => item.tags)))
    .sort()
    .map(tag => ({ label: tag, value: tag })),
])

const filteredOperations = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return operations.value.filter(operation => {
    const matchesMethod = selectedMethod.value === 'all' || operation.method === selectedMethod.value
    const matchesTag = selectedTag.value === 'all' || operation.tags.includes(selectedTag.value)
    const matchesKeyword =
      !keyword ||
      operation.path.toLowerCase().includes(keyword) ||
      operation.summary.toLowerCase().includes(keyword) ||
      operation.description.toLowerCase().includes(keyword) ||
      operation.operationId.toLowerCase().includes(keyword)

    return matchesMethod && matchesTag && matchesKeyword
  })
})

const specVersion = computed(() => spec.value?.info?.version || '-')
const pathCount = computed(() => Object.keys(spec.value?.paths || {}).length)
const operationCount = computed(() => operations.value.length)
const tagCount = computed(() => tagOptions.value.length - 1)
const errorTitle = computed(() => String(error.value?.message || error.value || 'Failed to load OpenAPI spec'))

const methodColor: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  PATCH: 'info',
  DELETE: 'error',
}

useHead({
  title: computed(() => p('title')),
})
</script>

<template>
  <div class="space-y-4">
    <UPageHeader :title="p('title')" :description="p('description')">
      <template #links>
        <UButton
          :to="specUrl"
          target="_blank"
          variant="subtle"
          color="neutral"
          icon="i-lucide-file-json"
          label="GET /api/openapi"
        />
        <UButton variant="ghost" color="neutral" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" />
      </template>
    </UPageHeader>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <UCard>
        <div class="text-sm text-muted">Version</div>
        <div class="mt-1 font-semibold">
          {{ specVersion }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Paths</div>
        <div class="mt-1 font-semibold">
          {{ pathCount }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Operations</div>
        <div class="mt-1 font-semibold">
          {{ operationCount }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Tags</div>
        <div class="mt-1 font-semibold">
          {{ tagCount }}
        </div>
      </UCard>
    </div>

    <div class="flex flex-col gap-3 md:flex-row md:items-center">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search path, summary, operationId"
        class="md:max-w-md"
      />
      <USelect v-model="selectedMethod" :items="methodOptions" class="md:w-36" />
      <USelect v-model="selectedTag" :items="tagOptions" class="md:w-48" />
    </div>

    <TableSkeleton v-if="pending" :cols="3" :rows="8" />

    <UAlert v-else-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :title="errorTitle" />

    <EmptyState v-else-if="filteredOperations.length === 0" icon="i-lucide-file-search" :title="$t('common.noData')" />

    <div v-else class="divide-y divide-default rounded-lg border border-default bg-default">
      <div
        v-for="operation in filteredOperations"
        :key="`${operation.method}:${operation.path}`"
        class="grid gap-3 p-4 md:grid-cols-[96px_1fr_auto]"
      >
        <div>
          <UBadge :color="methodColor[operation.method] || 'neutral'" variant="subtle">
            {{ operation.method }}
          </UBadge>
        </div>
        <div class="min-w-0">
          <div class="font-mono text-sm font-semibold break-all">
            {{ operation.path }}
          </div>
          <div v-if="operation.summary" class="mt-1 text-sm">
            {{ operation.summary }}
          </div>
          <div v-if="operation.description" class="mt-1 text-xs text-muted line-clamp-2">
            {{ operation.description }}
          </div>
          <div v-if="operation.tags.length" class="mt-2 flex flex-wrap gap-1">
            <UBadge v-for="tag in operation.tags" :key="tag" size="xs" variant="outline">
              {{ tag }}
            </UBadge>
          </div>
        </div>
        <div class="flex items-start gap-2">
          <UBadge v-if="operation.secured" color="warning" variant="soft" size="xs"> Auth </UBadge>
          <UBadge v-if="operation.operationId" color="neutral" variant="soft" size="xs">
            {{ operation.operationId }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>
