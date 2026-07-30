<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'
import { METHODS } from '@/enums'

defineProps<{
  table: Table<Log>
  refresh: VoidFunction
  loading: boolean
}>()

const { i18nLog, i18nCommon } = useMessage()
const { getUserDisplayName } = useCurrentUser()
const { getLogsUserList, getSettings } = useSystemApi()

const { data: settingsData } = await useAsyncData('operation-log-retention', async () => {
  const res = await getSettings()
  return res.data?.values ?? {}
})

const retentionDays = computed(() => Number(settingsData.value?.['retention.operationLogDays'] || 365))

const query = defineModel<Pick<LogQueryParams, 'userId' | 'method' | 'action' | 'targetType' | 'startTime' | 'endTime'>>({
  required: true,
})

const { data: userList, pending: userloading } = await useAsyncData('operation-log-users', async () => {
  const res = await getLogsUserList()
  return res?.data ?? []
})

const startDate = ref('')
const endDate = ref('')

watch(startDate, (value) => {
  query.value.startTime = value ? new Date(`${value}T00:00:00`).getTime() : undefined
})

watch(endDate, (value) => {
  query.value.endTime = value ? new Date(`${value}T23:59:59`).getTime() : undefined
})

function handleExport() {
  const params = new URLSearchParams()
  if (query.value.userId)
    params.set('userId', query.value.userId)
  if (query.value.method)
    params.set('method', query.value.method)
  if (query.value.action)
    params.set('action', query.value.action)
  if (query.value.targetType)
    params.set('targetType', query.value.targetType)
  if (query.value.startTime)
    params.set('startTime', String(query.value.startTime))
  if (query.value.endTime)
    params.set('endTime', String(query.value.endTime))
  const qs = params.toString()
  window.open(`/api/system-settings/operation-log/export${qs ? `?${qs}` : ''}`, '_blank')
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <UBadge color="neutral" variant="subtle">
        留存 {{ retentionDays }} 天
      </UBadge>
      <USelectMenu
        v-model="query.userId"
        value-key="value"
        :items="
          userList?.map(u => {
            const userName = getUserDisplayName(u)
            return {
              value: u.id,
              label: userName,
              avatar: {
                src: u.image ?? undefined,
                alt: userName,
                loading: 'lazy' as const,
              },
            }
          })
        "
        clear
        :loading="userloading"
        class="w-48"
        :placeholder="i18nLog('user')"
      />
      <USelectMenu
        v-model="query.method"
        value-key="value"
        :items="METHODS.items.map(({ value, label, raw }) => ({ value, label, icon: raw.icon }))"
        clear
        class="w-36"
        :placeholder="i18nLog('method')"
      />
      <UInput v-model="query.action" class="w-48" placeholder="Action" />
      <USelect
        v-model="query.targetType"
        class="w-44"
        placeholder="Target"
        :items="[
          { label: 'channel', value: 'channel' },
          { label: 'api_key', value: 'api_key' },
          { label: 'prompt', value: 'prompt' },
          { label: 'tenant_package', value: 'tenant_package' },
          { label: 'organization', value: 'organization' },
          { label: 'agent', value: 'agent' },
          { label: 'knowledge_base', value: 'knowledge_base' },
          { label: 'mcp_tool', value: 'mcp_tool' },
        ]"
      />
      <UInput v-model="startDate" type="date" class="w-40" />
      <UInput v-model="endDate" type="date" class="w-40" />
      <AutoFormSearchButton :loading @refresh="refresh" />
      <UButton icon="lucide:download" variant="outline" @click="handleExport">
        {{ i18nCommon('exportCsv') }}
      </UButton>
    </div>
    <TableColumnVisibility v-if="table" :table="table" />
  </div>
</template>
