<script setup lang="ts">
const { getOrgList, insertOrg, updateOrg, getTenantPackageList } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

interface OrgRow {
  id: string
  name: string
  parentId?: string | null
  level: string
  tokenLimit?: number
  tokenUsed?: number
  packageId?: string | null
  expireTime?: string | null
  accountLimit?: number
  tenantStatus?: string
  children?: OrgRow[]
}

const p = (key: string) => t(`pages.aigate.dashboard.organization.${key}`)

const {
  data,
  refresh,
} = await useAsyncData('aigate-orgs', async () => {
  const res = await getOrgList({ flat: 1 })
  return (res.data?.items as OrgRow[]) ?? []
})
const { data: packages } = await useAsyncData('tenant-package-options', async () => {
  const res = await getTenantPackageList({ page: 1, pageSize: 100 })
  return res.data?.items || []
})
const list = computed(() => data.value || [])
const open = ref(false)
const editData = ref<OrgRow | { parentId?: string } | null>(null)
const editingOrgId = computed(() => (editData.value && 'id' in editData.value ? editData.value.id : null))
const saveLoading = ref(false)
const form = reactive({
  name: '',
  level: 'company',
  parentId: '',
  tokenLimit: 0,
  packageId: '',
  expireTime: '',
  accountLimit: -1,
  tenantStatus: 'active',
})
const isTopLevel = computed(() => !form.parentId)

function handleAdd(parentId?: string) {
  editData.value = parentId ? { parentId } : null
  form.name = ''
  form.level = 'company'
  form.parentId = parentId ?? ''
  form.tokenLimit = 0
  form.packageId = ''
  form.expireTime = ''
  form.accountLimit = -1
  form.tenantStatus = 'active'
  open.value = true
}

function handleEdit(row: OrgRow) {
  editData.value = row
  form.name = row.name
  form.level = row.level
  form.parentId = row.parentId ?? ''
  form.tokenLimit = row.tokenLimit ?? 0
  form.packageId = row.packageId ?? ''
  form.expireTime = row.expireTime ? row.expireTime.slice(0, 10) : ''
  form.accountLimit = row.accountLimit ?? -1
  form.tenantStatus = row.tenantStatus || 'active'
  open.value = true
}

async function handleSubmit() {
  if (!form.name)
    return
  saveLoading.value = true
  try {
    const body = {
      name: form.name,
      level: form.level,
      parentId: form.parentId || null,
      tokenLimit: Number(form.tokenLimit) || 0,
      ...(isTopLevel.value
        ? {
            packageId: form.packageId || null,
            expireTime: form.expireTime ? new Date(form.expireTime).toISOString() : null,
            accountLimit: Number(form.accountLimit),
            tenantStatus: form.tenantStatus,
          }
        : {}),
    }
    if (editingOrgId.value) {
      await updateOrg({ ...body, id: editingOrgId.value })
    }
    else {
      await insertOrg(body)
    }
    successToast()
    open.value = false
    refresh()
  }
  finally {
    saveLoading.value = false
  }
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
          <UIcon
            :name="
              org.level === 'group' ? 'lucide:home' : org.level === 'company' ? 'lucide:building-2' : 'lucide:folder'
            "
            class="text-primary"
          />
          <h3 class="font-bold">
            {{ org.name }}
          </h3>
          <UBadge variant="outline" size="xs">
            {{ org.level }}
          </UBadge>
          <UBadge v-if="!org.parentId && org.packageId" color="primary" variant="subtle" size="xs">
            package
          </UBadge>
          <UBadge v-if="!org.parentId && org.tenantStatus === 'suspended'" color="error" variant="subtle" size="xs">
            suspended
          </UBadge>
        </div>
        <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(org)" />
      </div>
      <div v-if="org.tokenLimit" class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted">{{ p('tokenQuota') }}</span>
          <span class="font-mono">{{ ((org.tokenUsed ?? 0) / 1000000).toFixed(1) }}M / {{ (org.tokenLimit / 1000000).toFixed(1) }}M</span>
        </div>
        <UProgress
          :model-value="Math.round(((org.tokenUsed ?? 0) / org.tokenLimit) * 100)"
          :color="getQuotaColor(org.tokenUsed ?? 0, org.tokenLimit)"
        />
      </div>
      <div v-if="org.children?.length" class="mt-3 pl-6 border-l-2 border-muted space-y-2">
        <div v-for="child in org.children" :key="child.id" class="flex items-center justify-between text-sm">
          <span>{{ child.name }}</span>
          <span class="font-mono text-muted">{{
            child.tokenLimit
              ? `${((child.tokenUsed ?? 0) / 1000000).toFixed(1)}M / ${(child.tokenLimit / 1000000).toFixed(1)}M`
              : '-'
          }}</span>
        </div>
      </div>
    </UCard>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ editingOrgId ? '编辑组织' : p('add') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="类型">
            <USelect
              v-model="form.level"
              :items="[
                { label: '集团', value: 'group' },
                { label: '公司', value: 'company' },
                { label: '部门', value: 'department' },
                { label: '团队', value: 'team' },
              ]"
            />
          </UFormField>
          <UFormField label="父节点">
            <USelect
              v-model="form.parentId"
              :items="[
                { label: '无', value: '' },
                ...list
                  .filter(org => org.id !== editingOrgId)
                  .map(org => ({ label: org.name, value: org.id })),
              ]"
            />
          </UFormField>
          <UFormField :label="p('tokenQuota')">
            <UInput v-model.number="form.tokenLimit" type="number" min="0" />
          </UFormField>
          <template v-if="isTopLevel">
            <UFormField label="Tenant package">
              <USelect
                v-model="form.packageId"
                :items="[
                  { label: 'Unlimited', value: '' },
                  ...(packages || []).map(item => ({ label: item.name, value: item.id })),
                ]"
              />
            </UFormField>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Expire date">
                <UInput v-model="form.expireTime" type="date" />
              </UFormField>
              <UFormField label="Account limit">
                <UInput v-model.number="form.accountLimit" type="number" min="-1" />
              </UFormField>
            </div>
            <UFormField label="Tenant status">
              <USelect
                v-model="form.tenantStatus"
                :items="[
                  { label: 'Active', value: 'active' },
                  { label: 'Suspended', value: 'suspended' },
                ]"
              />
            </UFormField>
          </template>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="saveLoading" :disabled="!form.name" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
