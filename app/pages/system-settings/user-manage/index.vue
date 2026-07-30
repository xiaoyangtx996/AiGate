<script setup lang="ts">
import type { PaginationState } from '@tanstack/vue-table'
import type { SubmitForm } from './components/FormModal.vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import BanUserFormModal from './components/BanUserFormModal.vue'
import FormModal from './components/FormModal.vue'
import HeaderContent from './components/HeaderContent.vue'
import ResetPasswordModal from './components/ResetPasswordModal.vue'
import SessionsModal from './components/SessionsModal.vue'

const { initialPagination, pageSizeOptions } = usePagination()
const { getUserList, importUsers, offboardUser } = useSystemApi()
const { $authClient } = useNuxtApp()
const { i18nCommon } = useMessage()
const confirm = useConfirmDialog()
const { successToast, errorToast } = useAppToast()
const { unbanUser } = useAuthActions()

const csvLineBreakPattern = /\r?\n/

const table = useTemplateRef('table')
const pagination = computed<PaginationState>(() => table.value?.tableApi?.getState().pagination ?? initialPagination)
const open = ref(false)
const editData = ref<User | null>(null)
const saveLoading = ref(false)
const deleteLoading = ref(false)
const formKey = ref(0)
const banUserId = ref<string | null>(null)
const resetPasswordUserId = ref<string | null>(null)
const viewSessionsUserId = ref<string | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const importOpen = ref(false)
const importResults = ref<Array<{ row: number, username?: string, ok: boolean, reason?: string }>>([])
const offboardOpen = ref(false)
const offboardTarget = ref<User | null>(null)
const offboardLoading = ref(false)
const offboardForm = reactive({
  confirmText: '',
  reason: 'offboarded',
  banUser: true,
  revokeApiKeys: true,
  removeMembers: true,
  transferAgents: false,
  transferKnowledgeBases: false,
  transferToUserId: '',
})

// 查询参数
const query = reactive<Pick<UserQueryParams, 'keyword'>>({
  keyword: undefined,
})

// 获取用户列表
const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'user-manage',
  async () => {
    const res = await getUserList({
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      ...query,
    })
    return res?.data
  },
  {
    // 如果存在待处理的请求，则完全不发出新的请求
    dedupe: 'defer',
  },
)
const list = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

const columnVisibility = ref({})

// 列固定
const columnPinning = ref({
  left: ['user'],
  right: ['action'],
})

// 新增回调
function handleAdd() {
  open.value = true
  formKey.value++
}

// 封禁/取消封禁
async function handleBanUser(row: User) {
  if (row.banned) {
    await unbanUser(row.id, refresh)
  }
  else {
    banUserId.value = row.id
    formKey.value++
  }
}

// 删除回调
async function handleDelete(id: string) {
  deleteLoading.value = true
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      const { error } = await $authClient.admin.removeUser({
        userId: id,
      })
      if (error) {
        errorToast(error.message)
        return false
      }
      return true
    },
  })
  if (confirmed) {
    successToast(i18nCommon('deleteSuccess'))
    refresh()
  }
}

const { columns } = userUserColumns({
  onViewSessions: (id) => {
    viewSessionsUserId.value = id
  },
  onEdit: (row) => {
    editData.value = row
    open.value = true
  },
  onBan: handleBanUser,
  onDelete: handleDelete,
  onResetPassword: (id) => {
    resetPasswordUserId.value = id
    formKey.value++
  },
  onOffboard: (row) => {
    offboardTarget.value = row
    offboardForm.confirmText = ''
    offboardForm.transferAgents = false
    offboardForm.transferKnowledgeBases = false
    offboardForm.transferToUserId = ''
    offboardOpen.value = true
  },
})

function parseCsv(text: string) {
  const lines = text.split(csvLineBreakPattern).map(line => line.trim()).filter(Boolean)
  const [headerLine, ...rows] = lines
  const headers = (headerLine || '').split(',').map(item => item.trim())
  return rows.map((line, index) => {
    const values = line.split(',').map(item => item.trim())
    return headers.reduce<Record<string, string>>((acc, key, valueIndex) => {
      acc[key] = values[valueIndex] || ''
      acc.row = String(index + 2)
      return acc
    }, {})
  })
}

async function handleImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file)
    return
  const rows = parseCsv(await file.text())
  try {
    const res = await importUsers(rows)
    importResults.value = res.data?.results || []
    importOpen.value = true
    refresh()
  }
  catch (error) {
    errorToast(error instanceof Error ? error.message : i18nCommon('actionFailed'))
  }
  finally {
    if (importInput.value)
      importInput.value.value = ''
  }
}

async function executeOffboard() {
  if (!offboardTarget.value)
    return
  offboardLoading.value = true
  try {
    await offboardUser(offboardTarget.value.id, { ...offboardForm })
    successToast()
    offboardOpen.value = false
    refresh()
  }
  finally {
    offboardLoading.value = false
  }
}

// 表单提交
async function handleSubmit(values: SubmitForm) {
  saveLoading.value = true
  try {
    if (editData.value?.id) {
      const { error } = await $authClient.admin.updateUser({
        userId: editData.value.id,
        data: values,
      })
      if (error) {
        return errorToast(error.message)
      }
    }
    else {
      const { displayUsername, username, ...formData } = values
      const { error } = await $authClient.admin.createUser({
        ...formData,
        email: `${username}@aigate.local`,
        data: {
          username,
          displayUsername,
        },
      })
      if (error) {
        return errorToast(error.message)
      }
    }
    successToast()
    open.value = false
    refresh()
  }
  catch (error) {
    errorToast(error instanceof Error ? error.message : i18nCommon('actionFailed'))
  }
  finally {
    saveLoading.value = false
  }
}

watch(
  () => pagination.value,
  () => {
    refresh()
  },
  { deep: true },
)

watch(open, (val) => {
  if (!val) {
    editData.value = null
  }
})
</script>

<template>
  <div class="space-y-4">
    <ClientOnly>
      <HeaderContent
        v-if="table?.tableApi"
        v-model="query"
        :refresh
        :handle-add
        :handle-import="() => importInput?.click()"
        :loading
        :table="table?.tableApi"
      />
    </ClientOnly>
    <input ref="importInput" type="file" accept=".csv" class="hidden" @change="handleImportFile">
    <UTable
      ref="table"
      v-model:column-visibility="columnVisibility"
      v-model:column-pinning="columnPinning"
      :loading
      :data="list"
      :columns="columns"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel(),
        pageCount: Math.ceil((total || 0) / initialPagination.pageSize),
        manualPagination: true,
      }"
      :get-row-id="row => row.id"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-center',
        tr: 'group',
        td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default text-center',
      }"
    />
    <ClientOnly>
      <TablePagination
        v-if="table?.tableApi"
        :table="table?.tableApi"
        :total="total"
        :page-size-options="pageSizeOptions"
      />
    </ClientOnly>
    <FormModal
      v-model="open"
      :data="editData"
      :menu-tree="data || []"
      :loading="saveLoading"
      :form-key
      @submit="handleSubmit"
    />
    <BanUserFormModal v-model:user-id="banUserId" :form-key :refresh />
    <ResetPasswordModal v-model:user-id="resetPasswordUserId" :form-key :refresh />
    <SessionsModal v-model:user-id="viewSessionsUserId" :refresh />

    <UModal v-model:open="importOpen">
      <template #header>
        <h3 class="font-bold">
          Import result
        </h3>
      </template>
      <template #body>
        <div class="space-y-2">
          <div v-for="item in importResults" :key="item.row" class="flex items-center justify-between rounded-md border p-2">
            <span class="text-sm">#{{ item.row }} {{ item.username || '-' }}</span>
            <UBadge :color="item.ok ? 'success' : 'error'" variant="subtle">
              {{ item.ok ? 'OK' : item.reason }}
            </UBadge>
          </div>
        </div>
      </template>
    </UModal>

    <USlideover v-model:open="offboardOpen">
      <template #header>
        <h3 class="font-bold">
          Offboard user
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="soft"
            icon="lucide:triangle-alert"
            :title="offboardTarget?.username || offboardTarget?.email || offboardTarget?.name"
            description="Type the username or email to confirm offboarding."
          />
          <UCheckbox v-model="offboardForm.banUser" label="Ban account" />
          <UCheckbox v-model="offboardForm.revokeApiKeys" label="Revoke all API keys" />
          <UCheckbox v-model="offboardForm.removeMembers" label="Remove organization memberships" />
          <UCheckbox v-model="offboardForm.transferAgents" label="Transfer owned Agents" />
          <UCheckbox v-model="offboardForm.transferKnowledgeBases" label="Transfer owned knowledge bases" />
          <UFormField
            v-if="offboardForm.transferAgents || offboardForm.transferKnowledgeBases"
            label="Transfer target user ID"
          >
            <UInput v-model="offboardForm.transferToUserId" placeholder="user id" />
          </UFormField>
          <UFormField label="Reason">
            <UInput v-model="offboardForm.reason" />
          </UFormField>
          <UFormField label="Confirm text">
            <UInput v-model="offboardForm.confirmText" :placeholder="offboardTarget?.username || offboardTarget?.email || ''" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="offboardOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="offboardLoading" @click="executeOffboard">
              Offboard
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
