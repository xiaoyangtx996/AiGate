<script setup lang="ts">
interface QuotaRequestRow {
  id: string
  organizationId: string
  organizationName?: string | null
  requesterId: string
  requesterName?: string | null
  requesterEmail?: string | null
  requestedTokenLimit: number
  currentTokenLimit: number
  reason?: string | null
  status: 'pending' | 'approved' | 'rejected'
  canDecide?: boolean
  decisionComment?: string | null
  createdAt: string
  decidedAt?: string | null
}

const { t } = useI18n()
const { getQuotaRequests, decideQuotaRequest } = useAigateApi()
const { successToast } = useAppToast()
const p = (key: string) => t(`pages.aigate.quotaRequests.${key}`)

const status = ref<'all' | 'pending' | 'approved' | 'rejected'>('pending')
const decidingId = ref<string | null>(null)
const comment = ref('')
const selectedRequest = ref<QuotaRequestRow | null>(null)
const decisionOpen = ref(false)
const decisionStatus = ref<'approved' | 'rejected'>('approved')

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'aigate-quota-requests',
  async () => {
    const params = status.value === 'all' ? {} : { status: status.value }
    const res = await getQuotaRequests(params)
    return (res.data ?? []) as QuotaRequestRow[]
  },
  { watch: [status], dedupe: 'defer' },
)

const list = computed(() => data.value ?? [])
const statusItems = computed(() => [
  { label: p('status.all'), value: 'all' },
  { label: p('status.pending'), value: 'pending' },
  { label: p('status.approved'), value: 'approved' },
  { label: p('status.rejected'), value: 'rejected' },
])

function formatTokens(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return String(value)
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function requesterLabel(row: QuotaRequestRow) {
  return row.requesterName || row.requesterEmail || row.requesterId
}

function openDecision(row: QuotaRequestRow, nextStatus: 'approved' | 'rejected') {
  selectedRequest.value = row
  decisionStatus.value = nextStatus
  comment.value = ''
  decisionOpen.value = true
}

async function submitDecision() {
  if (!selectedRequest.value) return
  decidingId.value = selectedRequest.value.id
  try {
    await decideQuotaRequest({
      id: selectedRequest.value.id,
      status: decisionStatus.value,
      comment: comment.value || undefined,
    })
    successToast(p('decisionDone'))
    decisionOpen.value = false
    refresh()
  } finally {
    decidingId.value = null
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <div class="flex items-center gap-2">
        <USelect v-model="status" :items="statusItems" class="w-36" />
        <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="refresh()" />
      </div>
    </div>

    <TableSkeleton v-if="loading" :cols="6" :rows="5" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:send"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UTable
      v-else
      :data="list"
      :columns="[
        { accessorKey: 'organizationId', header: p('organization') },
        { accessorKey: 'requesterId', header: p('requester') },
        { accessorKey: 'quota', header: p('quota') },
        { accessorKey: 'reason', header: p('reason') },
        { accessorKey: 'status', header: p('requestStatus') },
        { accessorKey: 'createdAt', header: p('createdAt') },
        { accessorKey: 'actions', header: $t('common.action') },
      ]"
    >
      <template #quota-cell="{ row }">
        <span class="font-mono"
          >{{ formatTokens(row.original.currentTokenLimit) }} →
          {{ formatTokens(row.original.requestedTokenLimit) }}</span
        >
      </template>
      <template #organizationId-cell="{ row }">
        <span>{{ row.original.organizationName || row.original.organizationId }}</span>
      </template>
      <template #requesterId-cell="{ row }">
        <div class="min-w-0">
          <p class="truncate">
            {{ requesterLabel(row.original) }}
          </p>
          <p v-if="row.original.requesterEmail" class="truncate text-xs text-muted">
            {{ row.original.requesterEmail }}
          </p>
        </div>
      </template>
      <template #reason-cell="{ row }">
        <span class="line-clamp-2 text-sm">{{ row.original.reason || p('noReason') }}</span>
      </template>
      <template #status-cell="{ row }">
        <UBadge
          :color="
            row.original.status === 'approved' ? 'success' : row.original.status === 'rejected' ? 'error' : 'warning'
          "
          variant="subtle"
        >
          {{ p(`status.${row.original.status}`) }}
        </UBadge>
      </template>
      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div v-if="row.original.status === 'pending' && row.original.canDecide !== false" class="flex gap-1">
          <UButton
            v-permission="'EDIT'"
            size="xs"
            color="success"
            variant="soft"
            @click="openDecision(row.original, 'approved')"
          >
            {{ p('approve') }}
          </UButton>
          <UButton
            v-permission="'EDIT'"
            size="xs"
            color="error"
            variant="soft"
            @click="openDecision(row.original, 'rejected')"
          >
            {{ p('reject') }}
          </UButton>
        </div>
        <span v-else class="text-xs text-muted">{{ formatDate(row.original.decidedAt) }}</span>
      </template>
    </UTable>

    <UModal v-model:open="decisionOpen">
      <template #header>
        <h3 class="font-bold">
          {{ decisionStatus === 'approved' ? p('approve') : p('reject') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div v-if="selectedRequest" class="rounded border border-default p-3 text-sm">
            <p class="font-medium">
              {{ formatTokens(selectedRequest.currentTokenLimit) }} →
              {{ formatTokens(selectedRequest.requestedTokenLimit) }}
            </p>
            <p class="text-muted">
              {{ selectedRequest.reason || p('noReason') }}
            </p>
          </div>
          <UFormField :label="p('comment')">
            <UTextarea v-model="comment" :rows="3" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="decisionOpen = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="decidingId === selectedRequest?.id" @click="submitDecision">
            {{ $t('common.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
