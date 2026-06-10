<script setup lang="ts">
interface WorkbenchData {
  profile?: {
    organizationName?: string | null
  }
  quota?: {
    tokenLimit: number
    tokenUsed: number
    remaining: number
    usagePercent: number
  } | null
  usage?: {
    totalTokens: number
    totalRequests: number
    totalCost: number
    daily: Array<{ date: string, tokens: number, requests: number }>
  }
  apiKeys?: Array<{
    id: string
    name: string
    status: string
    env?: string | null
    expiresAt?: string | null
    lastUsed?: string | null
    calls?: number | null
  }>
  agents?: Array<{
    id: string
    name: string
    description?: string | null
    model?: string | null
    status: string
  }>
  alerts?: Array<{
    id: string
    title: string
    message: string
    severity: string
    read: boolean
    createdAt: string
  }>
}

interface QuotaRequestRow {
  id: string
  requestedTokenLimit: number
  currentTokenLimit: number
  reason?: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

const { t } = useI18n()
const { getMyWorkbench, getQuotaRequests, createQuotaRequest } = useAigateApi()
const { successToast } = useAppToast()
const p = (key: string) => t(`pages.aigate.myWorkbench.${key}`)
const { data, pending: loading, refresh } = await useAsyncData('aigate-my-workbench', async () => {
  const res = await getMyWorkbench()
  return (res.data ?? {}) as WorkbenchData
}, { dedupe: 'defer' })
const { data: requestData, pending: requestLoading, refresh: refreshRequests } = await useAsyncData('aigate-my-quota-requests', async () => {
  const res = await getQuotaRequests({ mine: 'true' })
  return (res.data ?? []) as QuotaRequestRow[]
}, { dedupe: 'defer' })

const quota = computed(() => data.value?.quota ?? null)
const usage = computed(() => data.value?.usage)
const apiKeys = computed(() => data.value?.apiKeys ?? [])
const agents = computed(() => data.value?.agents ?? [])
const alerts = computed(() => data.value?.alerts ?? [])
const dailyUsage = computed(() => usage.value?.daily ?? [])
const quotaRequests = computed(() => requestData.value ?? [])
const quotaDialogOpen = ref(false)
const quotaSubmitting = ref(false)
const quotaForm = reactive({
  requestedTokenLimit: 0,
  reason: '',
})

function formatTokens(value?: number | null) {
  const n = value ?? 0
  if (n >= 1000000)
    return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)
    return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function formatCost(cents?: number | null) {
  return `¥${((cents ?? 0) / 100).toFixed(2)}`
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '-'
}

function quotaColor(percent: number) {
  return percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'
}

function openQuotaDialog() {
  quotaForm.requestedTokenLimit = quota.value?.tokenLimit || 0
  quotaForm.reason = ''
  quotaDialogOpen.value = true
}

async function submitQuotaRequest() {
  if (!quotaForm.requestedTokenLimit)
    return
  quotaSubmitting.value = true
  try {
    await createQuotaRequest({
      requestedTokenLimit: quotaForm.requestedTokenLimit,
      reason: quotaForm.reason || undefined,
    })
    successToast(p('requestSubmitted'))
    quotaDialogOpen.value = false
    refreshRequests()
  }
  finally {
    quotaSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">
          {{ p('title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ data?.profile?.organizationName || p('personalScope') }}
        </p>
      </div>
      <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="refresh()" />
    </div>

    <TableSkeleton v-if="loading" :cols="4" :rows="3" />
    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard>
          <p class="text-sm text-muted">
            {{ p('totalTokens') }}
          </p>
          <p class="text-2xl font-bold">
            {{ formatTokens(usage?.totalTokens) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ p('requests') }}
          </p>
          <p class="text-2xl font-bold">
            {{ usage?.totalRequests ?? 0 }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ p('cost') }}
          </p>
          <p class="text-2xl font-bold">
            {{ formatCost(usage?.totalCost) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ p('activeKeys') }}
          </p>
          <p class="text-2xl font-bold">
            {{ apiKeys.filter(key => key.status === 'active').length }}
          </p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-bold">
              {{ p('quota') }}
            </h3>
            <UButton v-if="quota" size="xs" variant="outline" icon="lucide:send" @click="openQuotaDialog">
              {{ p('requestQuota') }}
            </UButton>
          </div>
        </template>
        <div v-if="quota" class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span>{{ formatTokens(quota.tokenUsed) }} / {{ formatTokens(quota.tokenLimit) }}</span>
            <span class="font-mono">{{ quota.usagePercent }}%</span>
          </div>
          <UProgress :model-value="quota.usagePercent" :color="quotaColor(quota.usagePercent)" />
          <p class="text-sm text-muted">
            {{ p('remaining') }}：{{ formatTokens(quota.remaining) }}
          </p>
        </div>
        <EmptyState v-else icon="lucide:gauge" :title="p('noQuota')" :description="p('noQuotaDesc')" />
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-bold">
            {{ p('quotaRequests') }}
          </h3>
        </template>
        <TableSkeleton v-if="requestLoading" :cols="3" :rows="3" />
        <div v-else-if="quotaRequests.length" class="space-y-2">
          <div v-for="request in quotaRequests" :key="request.id" class="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
            <div class="min-w-0">
              <p class="truncate font-medium">
                {{ formatTokens(request.currentTokenLimit) }} → {{ formatTokens(request.requestedTokenLimit) }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ request.reason || p('noReason') }}
              </p>
            </div>
            <UBadge :color="request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'error' : 'warning'" variant="subtle">
              {{ p(`status.${request.status}`) }}
            </UBadge>
            <span class="text-xs text-muted">{{ formatDate(request.createdAt) }}</span>
          </div>
        </div>
        <EmptyState v-else icon="lucide:send" :title="p('noQuotaRequests')" :description="p('noQuotaRequestsDesc')" />
      </UCard>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-bold">
                {{ p('dailyUsage') }}
              </h3>
              <UButton size="xs" variant="outline" icon="lucide:scroll-text" to="/aigate/my-api-logs">
                {{ p('viewLogs') }}
              </UButton>
            </div>
          </template>
          <div v-if="dailyUsage.length" class="space-y-2">
            <div v-for="item in dailyUsage" :key="item.date" class="grid grid-cols-[1fr_auto_auto] gap-3 text-sm">
              <span>{{ item.date }}</span>
              <span class="font-mono">{{ formatTokens(item.tokens) }}</span>
              <span class="text-muted">{{ item.requests }} req</span>
            </div>
          </div>
          <EmptyState v-else icon="lucide:activity" :title="p('noUsage')" :description="p('noUsageDesc')" />
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-bold">
                {{ p('myKeys') }}
              </h3>
              <UButton size="xs" variant="outline" icon="lucide:key-round" to="/aigate/my-api-keys">
                {{ p('manageKeys') }}
              </UButton>
            </div>
          </template>
          <div v-if="apiKeys.length" class="space-y-3">
            <div v-for="key in apiKeys" :key="key.id" class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-medium">
                  {{ key.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ key.env || '-' }} · {{ p('lastUsed') }} {{ formatDate(key.lastUsed) }}
                </p>
              </div>
              <UBadge :color="key.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ key.status }}
              </UBadge>
            </div>
          </div>
          <EmptyState v-else icon="lucide:key" :title="p('noKeys')" :description="p('noKeysDesc')" />
        </UCard>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <h3 class="font-bold">
              {{ p('availableAgents') }}
            </h3>
          </template>
          <div v-if="agents.length" class="grid gap-3">
            <NuxtLink
              v-for="agent in agents"
              :key="agent.id"
              class="rounded border border-default p-3 hover:border-primary"
              :to="{ path: '/aigate/agents/chat', query: { agentId: agent.id } }"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-medium">
                    {{ agent.name }}
                  </p>
                  <p class="truncate text-xs text-muted">
                    {{ agent.description || agent.model }}
                  </p>
                </div>
                <UIcon name="lucide:message-square" class="text-muted" />
              </div>
            </NuxtLink>
          </div>
          <EmptyState v-else icon="lucide:bot" :title="p('noAgents')" :description="p('noAgentsDesc')" />
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-bold">
              {{ p('alerts') }}
            </h3>
          </template>
          <div v-if="alerts.length" class="space-y-3">
            <div v-for="alert in alerts" :key="alert.id" class="rounded border border-default p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-medium">
                    {{ alert.title }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ alert.message }}
                  </p>
                </div>
                <UBadge :color="alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'" variant="subtle">
                  {{ alert.severity }}
                </UBadge>
              </div>
            </div>
          </div>
          <EmptyState v-else icon="lucide:bell" :title="p('noAlerts')" :description="p('noAlertsDesc')" />
        </UCard>
      </div>
    </template>

    <UModal v-model:open="quotaDialogOpen">
      <template #header>
        <h3 class="font-bold">
          {{ p('requestQuota') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('requestedTokenLimit')" required>
            <UInput v-model.number="quotaForm.requestedTokenLimit" type="number" min="0" />
          </UFormField>
          <UFormField :label="p('reason')">
            <UTextarea v-model="quotaForm.reason" :rows="3" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="quotaDialogOpen = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="quotaSubmitting" :disabled="!quotaForm.requestedTokenLimit" @click="submitQuotaRequest">
            {{ $t('common.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
