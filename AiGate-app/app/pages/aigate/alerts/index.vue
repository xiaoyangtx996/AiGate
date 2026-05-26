<script setup lang="ts">
const { getAlertList, markAlertRead } = useAigateApi()
const { data, pending: loading, refresh } = await useAsyncData('aigate-alerts', async () => {
  const res = await getAlertList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
async function handleRead(id: string) { await markAlertRead(id); refresh() }
const severityColor: Record<string, string> = { info: 'info', warning: 'warning', critical: 'error' }
const severityIcon: Record<string, string> = { info: 'lucide:info', warning: 'lucide:alert-triangle', critical: 'lucide:alert-octagon' }
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-bold">告警中心</h2>
    <div class="space-y-3">
      <UCard v-for="a in list" :key="a.id" :class="!a.read ? 'border-l-4 border-l-warning' : 'opacity-60'">
        <div class="flex items-start gap-3">
          <UIcon :name="severityIcon[a.severity] || 'lucide:info'" class="text-lg mt-0.5" :class="`text-${severityColor[a.severity]}`" />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="font-bold">{{ a.title }}</h3>
              <UBadge :color="severityColor[a.severity] as any" variant="subtle" size="xs">{{ a.severity }}</UBadge>
            </div>
            <p class="text-sm text-muted mt-1">{{ a.message }}</p>
            <p class="text-xs text-muted mt-2">{{ new Date(a.createdAt).toLocaleString() }}</p>
          </div>
          <UButton v-if="!a.read" size="xs" variant="ghost" @click="handleRead(a.id)">已读</UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
