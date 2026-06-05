<script setup lang="ts">
const { getAlertList, markAlertRead, runAlertCheck } = useAigateApi()
const { successToast } = useAppToast()

const { data, pending: loading, refresh } = await useAsyncData('aigate-alerts', async () => {
  const res = await getAlertList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
const unreadCount = computed(() => list.value.filter((a: any) => !a.read).length)
const checking = ref(false)

async function handleRead(id: string) {
  await markAlertRead(id)
  refresh()
}

async function handleCheckAlerts() {
  checking.value = true
  try {
    await runAlertCheck()
    successToast('告警检测完成')
    refresh()
  }
  finally { checking.value = false }
}

const severityColor: Record<string, string> = { info: 'info', warning: 'warning', critical: 'error' }
const severityIcon: Record<string, string> = { info: 'lucide:info', warning: 'lucide:alert-triangle', critical: 'lucide:alert-octagon' }
const typeLabel: Record<string, string> = { quota_warning: '配额预警', key_expiring: '密钥过期', error_spike: '错误激增', rate_limit: '限流告警', system: '系统告警' }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold">告警中心</h2>
        <UBadge v-if="unreadCount > 0" color="error" variant="solid" size="sm">{{ unreadCount }} 条未读</UBadge>
      </div>
      <UButton :loading="checking" icon="lucide:refresh-cw" variant="outline" @click="handleCheckAlerts">检测告警</UButton>
      <UButton icon="lucide:settings" variant="ghost" to="/aigate/alerts/rules">规则配置</UButton>
    </div>

    <div class="space-y-3">
      <UCard v-for="a in list" :key="a.id" :class="!a.read ? 'border-l-4 border-l-warning' : 'opacity-60'">
        <div class="flex items-start gap-3">
          <UIcon :name="severityIcon[a.severity] || 'lucide:info'" class="text-lg mt-0.5" :class="`text-${severityColor[a.severity]}`" />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="font-bold">{{ a.title }}</h3>
              <div class="flex items-center gap-2">
                <UBadge variant="outline" size="xs">{{ typeLabel[a.type] || a.type }}</UBadge>
                <UBadge :color="severityColor[a.severity] as any" variant="subtle" size="xs">{{ a.severity }}</UBadge>
              </div>
            </div>
            <p class="text-sm text-muted mt-1">{{ a.message }}</p>
            <p class="text-xs text-muted mt-2">{{ new Date(a.createdAt).toLocaleString() }}</p>
          </div>
          <UButton v-if="!a.read" size="xs" variant="ghost" @click="handleRead(a.id)">已读</UButton>
        </div>
      </UCard>
    </div>

    <div v-if="list.length === 0" class="text-center py-12 text-muted">
      <UIcon name="lucide:check-circle" class="text-4xl mb-2 text-success" />
      <p>暂无告警，系统运行正常</p>
    </div>
  </div>
</template>
