<script setup lang="ts">
const { getDashboard } = useAigateApi()
const { successToast } = useAppToast()

const { data: stats, pending: loading } = await useAsyncData('aigate-dashboard', async () => {
  const res = await getDashboard()
  return res.data
})

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-muted">本月 Token 消费</span>
          <UIcon name="lucide:trending-up" class="text-primary" />
        </div>
        <div class="text-3xl font-bold">{{ formatTokens(stats?.tokenUsage?.current || 0) }}</div>
        <div class="text-sm text-muted mt-1">同比 {{ stats?.tokenUsage?.percentage || 0 }}%</div>
      </UCard>

      <UCard>
        <div class="text-sm text-muted mb-2">活跃密钥</div>
        <div class="text-3xl font-bold">{{ stats?.activeKeys?.total || 0 }}</div>
        <div class="text-sm text-muted mt-1">{{ stats?.activeKeys?.expiringSoon || 0 }} 个即将过期</div>
      </UCard>

      <UCard>
        <div class="text-sm text-muted mb-2">MCP 工具调用</div>
        <div class="text-3xl font-bold">{{ stats?.mcpCalls?.total || 0 }}</div>
        <div class="text-sm text-primary mt-1">GitHub / Notion / 数据库</div>
      </UCard>

      <UCard>
        <div class="text-sm text-muted mb-2">Agent 对话</div>
        <div class="text-3xl font-bold">{{ stats?.agentConversations?.total || 0 }}</div>
        <div class="text-sm mt-1">
          <UBadge v-if="stats?.agentConversations?.withErrors" color="warning" variant="subtle" size="sm">
            {{ stats.agentConversations.withErrors }} 次异常
          </UBadge>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h3 class="font-bold">组织配额状态</h3>
      </template>
      <div class="space-y-4">
        <div v-for="org in (stats?.quotaStatus || [])" :key="org.organizationId" class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ org.organizationName }}</span>
              <UBadge v-if="org.isWarning" color="warning" variant="subtle" size="xs">90% 预警</UBadge>
            </div>
            <span class="text-sm font-mono" :class="org.isWarning ? 'text-warning' : 'text-muted'">{{ org.usedPercentage }}%</span>
          </div>
          <UProgress :model-value="org.usedPercentage" :color="org.isWarning ? 'warning' : 'primary'" />
        </div>
      </div>
    </UCard>
  </div>
</template>
