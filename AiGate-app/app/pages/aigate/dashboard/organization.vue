<script setup lang="ts">
const { getOrgList, insertOrg, updateOrg } = useAigateApi()
const { successToast } = useAppToast()

const { data, pending: loading, refresh } = await useAsyncData('aigate-orgs', async () => {
  const res = await getOrgList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)

function handleAdd(parentId?: string) { editData.value = parentId ? { parentId } : null; open.value = true }
function handleEdit(row: any) { editData.value = row; open.value = true }

async function handleSubmit(values: any) {
  saveLoading.value = true
  try {
    if (editData.value?.id) await updateOrg({ ...values, id: editData.value.id })
    else await insertOrg(values)
    successToast(); open.value = false; refresh()
  }
  finally { saveLoading.value = false }
}

function getQuotaColor(used: number, limit: number) {
  const pct = limit > 0 ? (used / limit) * 100 : 0
  return pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">组织与配额</h2>
      <UButton icon="lucide:plus" @click="handleAdd()">新增组织</UButton>
    </div>
    <UCard v-for="org in list" :key="org.id">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <UIcon :name="org.level === 'group' ? 'lucide:home' : org.level === 'company' ? 'lucide:building-2' : 'lucide:folder'" class="text-primary" />
          <h3 class="font-bold">{{ org.name }}</h3>
          <UBadge variant="outline" size="xs">{{ org.level }}</UBadge>
        </div>
        <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(org)" />
      </div>
      <div v-if="org.tokenLimit" class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted">Token 配额</span>
          <span class="font-mono">{{ (org.tokenUsed / 1000000).toFixed(1) }}M / {{ (org.tokenLimit / 1000000).toFixed(1) }}M</span>
        </div>
        <UProgress :model-value="Math.round((org.tokenUsed / org.tokenLimit) * 100)" :color="getQuotaColor(org.tokenUsed, org.tokenLimit)" />
      </div>
      <div v-if="org.children?.length" class="mt-3 pl-6 border-l-2 border-muted space-y-2">
        <div v-for="child in org.children" :key="child.id" class="flex items-center justify-between text-sm">
          <span>{{ child.name }}</span>
          <span class="font-mono text-muted">{{ child.tokenLimit ? `${(child.tokenUsed / 1000000).toFixed(1)}M / ${(child.tokenLimit / 1000000).toFixed(1)}M` : '-' }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
