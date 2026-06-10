<script setup lang="ts">
interface MemberRow {
  id: string
  userId: string
  organizationId: string
  createdAt: string
  userName?: string | null
  userEmail?: string | null
  userImage?: string | null
}

interface OrgOption {
  id: string
  name: string
}

const { getMemberList, insertMember, delMember, getOrgList } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'aigate-members',
  async () => {
    const res = await getMemberList({
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const { data: orgs } = await useAsyncData('aigate-orgs-for-member', async () => {
  const res = await getOrgList()
  return (res.data?.items ?? []) as OrgOption[]
})

const list = computed(() => (data.value?.items ?? []) as MemberRow[])
const total = computed(() => data.value?.total ?? 0)
const open = ref(false)
const saveLoading = ref(false)
const form = reactive({ userId: '', organizationId: '' })

function handleSearch() {
  page.value = 1
  refresh()
}

function handleAdd() {
  form.userId = ''
  form.organizationId = ''
  open.value = true
}

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
  } finally {
    saveLoading.value = false
  }
}

const p = (key: string) => t(`pages.aigate.members.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="handleSearch" />
      <UButton icon="lucide:user-plus" @click="handleAdd">
        {{ p('add') }}
      </UButton>
    </div>

    <TableSkeleton v-if="loading" :cols="5" :rows="5" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:users"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <template v-else>
      <UTable
        :data="list"
        :columns="[
          { accessorKey: 'userName', header: p('username') },
          { accessorKey: 'userEmail', header: p('email') },
          { accessorKey: 'organizationId', header: p('org') },
          { accessorKey: 'createdAt', header: p('joinDate') },
          { accessorKey: 'actions', header: $t('common.action') },
        ]"
      >
        <template #userName-cell="{ row }">
          <div class="flex items-center gap-2">
            <UAvatar :src="row.original.userImage ?? undefined" size="xs" />
            <span>{{ row.original.userName || '-' }}</span>
          </div>
        </template>
        <template #createdAt-cell="{ row }">
          {{ new Date(row.original.createdAt).toLocaleDateString() }}
        </template>
        <template #actions-cell="{ row }">
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            icon="lucide:trash-2"
            @click="handleDelete(row.original.id)"
          />
        </template>
      </UTable>
      <div v-if="total > 0" class="flex justify-end">
        <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
      </div>
    </template>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ p('add') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('userId')" required>
            <UInput v-model="form.userId" :placeholder="p('userIdPlaceholder')" />
          </UFormField>
          <UFormField :label="p('org')" required>
            <USelect
              v-model="form.organizationId"
              :items="(orgs || []).map(o => ({ label: o.name, value: o.id }))"
              :placeholder="p('orgPlaceholder')"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="saveLoading" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
