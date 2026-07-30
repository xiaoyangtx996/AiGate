<script setup lang="ts">
interface OrgNode {
  id: string
  name: string
  parentId: string | null
  level: string
  tokenLimit: number
  tokenUsed: number
  packageId?: string | null
  expireTime?: string | null
  accountLimit?: number
  tenantStatus?: string
  children?: OrgNode[]
}

const { getOrgTree, updateOrg } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const { data: tree, pending: loading, refresh } = await useAsyncData('aigate-org-tree', async () => {
  const res = await getOrgTree()
  return (res.data ?? []) as OrgNode[]
})

const expandedIds = ref<Set<string>>(new Set())
const editOpen = ref(false)
const editSaving = ref(false)
const editNode = ref<OrgNode | null>(null)
const editForm = reactive({
  expireTime: '',
  tenantStatus: 'active',
})

function toggleExpand(id: string) {
  if (expandedIds.value.has(id))
    expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

function expandAll(nodes: OrgNode[]) {
  for (const node of nodes) {
    expandedIds.value.add(node.id)
    if (node.children?.length)
      expandAll(node.children)
  }
}

function collapseAll() {
  expandedIds.value.clear()
}

watchEffect(() => {
  if (tree.value?.length)
    expandAll(tree.value)
})

function formatTokens(n: number) {
  if (!n)
    return '0'
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
}

function getQuotaPercent(used: number, limit: number) {
  return limit > 0 ? Math.round((used / limit) * 100) : 0
}

function getQuotaColor(pct: number): 'error' | 'warning' | 'success' {
  return pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
}

function daysUntil(date?: string | null) {
  if (!date)
    return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

function expiryBadgeColor(date?: string | null): 'error' | 'warning' | 'neutral' | null {
  const left = daysUntil(date)
  if (left === null)
    return null
  if (left <= 7)
    return 'error'
  if (left <= 14)
    return 'warning'
  return 'neutral'
}

function isInactive(node: OrgNode) {
  return node.tenantStatus === 'suspended' || node.tenantStatus === 'disabled'
}

function openEdit(node: OrgNode) {
  if (node.parentId)
    return
  editNode.value = node
  editForm.expireTime = node.expireTime ? new Date(node.expireTime).toISOString().slice(0, 10) : ''
  editForm.tenantStatus = node.tenantStatus || 'active'
  editOpen.value = true
}

async function saveEdit() {
  if (!editNode.value)
    return
  editSaving.value = true
  try {
    await updateOrg({
      id: editNode.value.id,
      expireTime: editForm.expireTime ? new Date(editForm.expireTime).toISOString() : null,
      tenantStatus: editForm.tenantStatus,
    })
    successToast()
    editOpen.value = false
    await refresh()
  }
  finally {
    editSaving.value = false
  }
}

const levelIcons: Record<string, string> = {
  group: 'lucide:home',
  company: 'lucide:building-2',
  department: 'lucide:folder',
  project: 'lucide:folder-open',
}

const p = (key: string) => t(`pages.aigate.organizations.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <div class="flex gap-2">
        <UButton size="sm" variant="outline" icon="lucide:chevrons-down" @click="tree && expandAll(tree)">
          {{ p('expandAll') }}
        </UButton>
        <UButton size="sm" variant="outline" icon="lucide:chevrons-up" @click="collapseAll">
          {{ p('collapseAll') }}
        </UButton>
      </div>
    </div>

    <TableSkeleton v-if="loading" :cols="3" :rows="4" />
    <EmptyState
      v-else-if="!tree?.length"
      icon="lucide:building-2"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UCard v-else>
      <div class="space-y-2">
        <template v-for="node in tree" :key="node.id">
          <div
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            :class="isInactive(node) ? 'opacity-50' : ''"
            @click="node.children?.length && toggleExpand(node.id)"
          >
            <UIcon
              v-if="node.children?.length"
              :name="expandedIds.has(node.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
              class="text-muted shrink-0"
            />
            <div v-else class="w-4 shrink-0" />

            <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UIcon :name="levelIcons[node.level] || 'lucide:folder'" class="text-primary" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium">{{ node.name }}</span>
                <UBadge variant="outline" size="xs">
                  {{ node.level }}
                </UBadge>
                <UBadge v-if="!node.parentId && node.packageId" color="primary" variant="subtle" size="xs">
                  package
                </UBadge>
                <UBadge v-if="!node.parentId && isInactive(node)" color="neutral" variant="subtle" size="xs">
                  {{ node.tenantStatus }}
                </UBadge>
                <UBadge
                  v-if="!node.parentId && expiryBadgeColor(node.expireTime)"
                  :color="expiryBadgeColor(node.expireTime)!"
                  variant="subtle"
                  size="xs"
                >
                  {{ daysUntil(node.expireTime) }}d
                </UBadge>
              </div>
              <div v-if="node.tokenLimit > 0" class="mt-1">
                <div class="flex items-center gap-2 text-xs text-muted">
                  <span>{{ formatTokens(node.tokenUsed) }} / {{ formatTokens(node.tokenLimit) }}</span>
                  <span>{{ getQuotaPercent(node.tokenUsed, node.tokenLimit) }}%</span>
                </div>
                <UProgress
                  :model-value="getQuotaPercent(node.tokenUsed, node.tokenLimit)"
                  :color="getQuotaColor(getQuotaPercent(node.tokenUsed, node.tokenLimit))"
                  class="mt-1"
                  size="xs"
                />
              </div>
            </div>
            <UButton
              v-if="!node.parentId"
              size="xs"
              variant="ghost"
              icon="lucide:settings-2"
              @click.stop="openEdit(node)"
            />
          </div>

          <div
            v-if="node.children?.length && expandedIds.has(node.id)"
            class="ml-8 border-l-2 border-muted pl-2 space-y-1"
          >
            <div
              v-for="child in node.children"
              :key="child.id"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              :class="isInactive(child) ? 'opacity-50' : ''"
              @click="child.children?.length && toggleExpand(child.id)"
            >
              <UIcon
                v-if="child.children?.length"
                :name="expandedIds.has(child.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                class="text-muted shrink-0"
              />
              <div v-else class="w-4 shrink-0" />

              <UIcon :name="levelIcons[child.level] || 'lucide:folder'" class="text-muted" />

              <div class="flex-1 min-w-0">
                <span class="text-sm">{{ child.name }}</span>
                <span v-if="child.tokenLimit > 0" class="text-xs text-muted ml-2">
                  {{ formatTokens(child.tokenUsed) }}/{{ formatTokens(child.tokenLimit) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </UCard>

    <UModal v-model:open="editOpen">
      <template #header>
        <h3 class="font-bold">
          租户生命周期
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="到期日">
            <UInput v-model="editForm.expireTime" type="date" />
          </UFormField>
          <UFormField label="状态">
            <USelect
              v-model="editForm.tenantStatus"
              :items="[
                { label: 'active', value: 'active' },
                { label: 'suspended', value: 'suspended' },
                { label: 'disabled', value: 'disabled' },
              ]"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="editOpen = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="editSaving" @click="saveEdit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
