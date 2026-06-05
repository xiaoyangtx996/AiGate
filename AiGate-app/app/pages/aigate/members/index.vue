<script setup lang="ts">
const { getMemberList, insertMember, delMember, getOrgList } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const keyword = ref('')
const { data, pending: loading, refresh } = await useAsyncData('aigate-members', async () => {
  const res = await getMemberList({ keyword: keyword.value })
  return res.data ?? []
})

const { data: orgs } = await useAsyncData('aigate-orgs-for-member', async () => {
  const res = await getOrgList()
  return res.data ?? []
})

const list = computed(() => data.value || [])
const open = ref(false)
const saveLoading = ref(false)
const form = reactive({ userId: '', organizationId: '' })

function handleAdd() { form.userId = ''; form.organizationId = ''; open.value = true }

async function handleDelete(id: string) {
  await delMember(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.userId || !form.organizationId) return
  saveLoading.value = true
  try {
    await insertMember(form)
    successToast()
    open.value = false
    refresh()
  }
  finally { saveLoading.value = false }
}

const p = (key: string) => t(`pages.aigate.members.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="refresh" />
      <UButton icon="lucide:user-plus" @click="handleAdd">{{ p('add') }}</UButton>
    </div>

    <UTable :loading :data="list" :columns="[
      { accessorKey: 'userName', header: p('username') },
      { accessorKey: 'userEmail', header: p('email') },
      { accessorKey: 'organizationId', header: p('org') },
      { accessorKey: 'createdAt', header: p('joinDate') },
      { accessorKey: 'actions', header: $t('common.action') },
    ]">
      <template #userName-cell="{ row }">
        <div class="flex items-center gap-2">
          <UAvatar :src="row.original.userImage" size="xs" />
          <span>{{ row.original.userName || '-' }}</span>
        </div>
      </template>
      <template #createdAt-cell="{ row }">
        {{ new Date(row.original.createdAt).toLocaleDateString() }}
      </template>
      <template #actions-cell="{ row }">
        <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(row.original.id)" />
      </template>
    </UTable>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">{{ p('add') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="用户 ID" required>
            <UInput v-model="form.userId" placeholder="输入用户 ID" />
          </UFormField>
          <UFormField :label="p('org')" required>
            <USelect v-model="form.organizationId" :items="(orgs || []).map((o: any) => ({ label: o.name, value: o.id }))" placeholder="选择组织" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="saveLoading" @click="handleSubmit">{{ $t('common.confirm') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
