<script setup lang="ts">
import type { PaginationState } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import HeaderContent from './components/HeaderContent.vue'

const { getLogsList } = useSystemApi()
const { initialPagination, pageSizeOptions } = usePagination()

const table = useTemplateRef('table')
const query = reactive<Pick<LogQueryParams, 'userId' | 'method' | 'action' | 'targetType' | 'startTime' | 'endTime'>>({
  userId: undefined,
  method: undefined,
  action: undefined,
  targetType: undefined,
  startTime: undefined,
  endTime: undefined,
})

const pagination = computed<PaginationState>(() => table.value?.tableApi?.getState().pagination ?? initialPagination)

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'operation-log',
  async () => {
    const res = await getLogsList({
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      ...query,
    })
    return res?.data
  },
  {
    dedupe: 'defer',
  },
)
const list = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

const { columns } = useLogColumns({ onDetail: openDetail })

const columnVisibility = ref({})
const detailOpen = ref(false)
const selectedLog = ref<Log | null>(null)

type AuditDiffType = 'added' | 'removed' | 'changed'

function openDetail(row: Log) {
  selectedLog.value = row
  detailOpen.value = true
}

function stringifyJson(value: unknown) {
  return value ? JSON.stringify(value, null, 2) : '-'
}

function auditKeys(value: unknown) {
  if (!value || typeof value !== 'object')
    return []
  return Object.keys(value as Record<string, unknown>)
}

const changedKeys = computed(() => {
  const before = selectedLog.value?.before as Record<string, unknown> | null | undefined
  const after = selectedLog.value?.after as Record<string, unknown> | null | undefined
  const keys = new Set([...auditKeys(before), ...auditKeys(after)])
  return [...keys].filter(key => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
})

const diffEntries = computed(() => {
  const before = selectedLog.value?.before as Record<string, unknown> | null | undefined
  const after = selectedLog.value?.after as Record<string, unknown> | null | undefined
  return changedKeys.value.map((key) => {
    const hasBefore = before ? Object.prototype.hasOwnProperty.call(before, key) : false
    const hasAfter = after ? Object.prototype.hasOwnProperty.call(after, key) : false
    const type: AuditDiffType = !hasBefore ? 'added' : !hasAfter ? 'removed' : 'changed'
    return {
      key,
      type,
      before: before?.[key],
      after: after?.[key],
    }
  })
})

const diffColor: Record<AuditDiffType, 'success' | 'error' | 'warning'> = {
  added: 'success',
  removed: 'error',
  changed: 'warning',
}

watch(
  () => pagination.value,
  () => {
    refresh()
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-4">
    <ClientOnly>
      <HeaderContent v-if="table?.tableApi" v-model="query" :refresh :loading :table="table?.tableApi" />
    </ClientOnly>
    <UTable
      ref="table"
      v-model:column-visibility="columnVisibility"
      :loading
      :data="list"
      :columns="columns"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel(),
        pageCount: Math.ceil((total || 0) / initialPagination.pageSize),
        manualPagination: true,
      }"
      :get-row-id="row => row.id"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-center',
        tr: 'group',
        td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default text-center',
      }"
    >
      <template #expanded="{ row }">
        <div class="space-y-2 text-left">
          <div>Action: {{ row.original.action }}</div>
          <div>Target: {{ row.original.targetType || '-' }} / {{ row.original.targetId || '-' }}</div>
          <div v-if="row.original.params">
            Params:
            <pre>{{ row.original.params }}</pre>
          </div>
        </div>
      </template>
    </UTable>
    <ClientOnly>
      <TablePagination
        v-if="table?.tableApi"
        :table="table?.tableApi"
        :total="total"
        :page-size-options="pageSizeOptions"
      />
    </ClientOnly>

    <USlideover v-model:open="detailOpen">
      <template #header>
        <div>
          <h3 class="font-bold">
            Audit Detail
          </h3>
          <p class="text-xs text-muted">
            {{ selectedLog?.action }} · {{ selectedLog?.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : '-' }}
          </p>
        </div>
      </template>
      <template #body>
        <div v-if="selectedLog" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                User
              </p>
              <p class="font-medium">
                {{ selectedLog.user?.name || selectedLog.user?.email || selectedLog.userId }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Target
              </p>
              <p class="font-mono text-sm">
                {{ selectedLog.targetType || '-' }} / {{ selectedLog.targetId || '-' }}
              </p>
            </div>
          </div>

          <div v-if="diffEntries.length" class="flex flex-wrap gap-2">
            <UBadge v-for="item in diffEntries" :key="item.key" :color="diffColor[item.type]" variant="subtle">
              {{ item.key }} · {{ item.type }}
            </UBadge>
          </div>

          <div v-if="diffEntries.length" class="overflow-x-auto rounded-md border">
            <div class="min-w-[760px]">
              <div class="grid grid-cols-[140px_96px_1fr_1fr] border-b bg-elevated/50 px-3 py-2 text-xs font-medium text-muted">
                <span>Field</span>
                <span>Type</span>
                <span>Before</span>
                <span>After</span>
              </div>
              <div
                v-for="item in diffEntries"
                :key="item.key"
                class="grid grid-cols-[140px_96px_1fr_1fr] gap-2 border-b px-3 py-2 text-xs last:border-b-0"
              >
                <span class="font-medium">{{ item.key }}</span>
                <UBadge :color="diffColor[item.type]" variant="soft" size="xs" class="w-fit">
                  {{ item.type }}
                </UBadge>
                <pre class="max-h-28 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{{ stringifyJson(item.before) }}</pre>
                <pre class="max-h-28 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{{ stringifyJson(item.after) }}</pre>
              </div>
            </div>
          </div>

          <div class="grid gap-3 lg:grid-cols-2">
            <div class="rounded-md border p-3">
              <p class="mb-2 text-sm font-medium">
                Before
              </p>
              <pre class="max-h-[55vh] overflow-auto whitespace-pre-wrap text-xs">{{ stringifyJson(selectedLog.before) }}</pre>
            </div>
            <div class="rounded-md border p-3">
              <p class="mb-2 text-sm font-medium">
                After
              </p>
              <pre class="max-h-[55vh] overflow-auto whitespace-pre-wrap text-xs">{{ stringifyJson(selectedLog.after) }}</pre>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
