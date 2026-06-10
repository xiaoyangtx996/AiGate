<script setup lang="ts">
const { getOrgList } = useAigateApi()
const { t } = useI18n()

interface OrgRow {
  id: string
  name: string
  level: string
  tokenLimit?: number
  tokenUsed?: number
  children?: OrgRow[]
}

const p = (key: string) => t(`pages.aigate.dashboard.organization.${key}`)

const { data } = await useAsyncData('aigate-orgs', async () => {
  const res = await getOrgList()
  return res.data?.items as OrgRow[] ?? []
})
const list = computed(() => data.value || [])
const open = ref(false)
const editData = ref<{ id?: string, parentId?: string } | null>(null)

function handleAdd(parentId?: string) {
  editData.value = parentId ? { parentId } : null
  open.value = true
}

function handleEdit(row: { id: string }) {
  editData.value = row
  open.value = true
}
function getQuotaColor(used: number, limit: number) {
  const pct = limit > 0 ? (used / limit) * 100 : 0
  return pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <UButton icon="lucide:plus" @click="handleAdd()">
        {{ p('add') }}
      </UButton>
    </div>
    <UCard v-for="org in list" :key="org.id">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <UIcon :name="org.level === 'group' ? 'lucide:home' : org.level === 'company' ? 'lucide:building-2' : 'lucide:folder'" class="text-primary" />
          <h3 class="font-bold">
            {{ org.name }}
          </h3>
          <UBadge variant="outline" size="xs">
            {{ org.level }}
          </UBadge>
        </div>
        <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(org)" />
      </div>
      <div v-if="org.tokenLimit" class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted">{{ p('tokenQuota') }}</span>
          <span class="font-mono">{{ ((org.tokenUsed ?? 0) / 1000000).toFixed(1) }}M / {{ (org.tokenLimit / 1000000).toFixed(1) }}M</span>
        </div>
        <UProgress :model-value="Math.round(((org.tokenUsed ?? 0) / org.tokenLimit) * 100)" :color="getQuotaColor(org.tokenUsed ?? 0, org.tokenLimit)" />
      </div>
      <div v-if="org.children?.length" class="mt-3 pl-6 border-l-2 border-muted space-y-2">
        <div v-for="child in org.children" :key="child.id" class="flex items-center justify-between text-sm">
          <span>{{ child.name }}</span>
          <span class="font-mono text-muted">{{ child.tokenLimit ? `${((child.tokenUsed ?? 0) / 1000000).toFixed(1)}M / ${(child.tokenLimit / 1000000).toFixed(1)}M` : '-' }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
