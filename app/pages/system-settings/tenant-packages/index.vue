<script setup lang="ts">
interface TenantPackageRow {
  id: string
  name: string
  description?: string | null
  menuCodes: string[]
  enabled: boolean
  sort: number
}

interface MenuNode {
  id: string
  label: string
  code?: string
  icon?: string
  to?: string
  children?: MenuNode[]
}

const {
  getTenantPackageList,
  insertTenantPackage,
  updateTenantPackage,
  delTenantPackage,
} = useAigateApi()
const { getMenuList } = useSystemApi()
const { successToast, errorToast } = useAppToast()
const confirm = useConfirmDialog()

const { data, pending, refresh } = await useAsyncData('tenant-packages', async () => {
  const res = await getTenantPackageList({ page: 1, pageSize: 100 })
  return (res.data?.items || []) as TenantPackageRow[]
})
const { data: menuTree } = await useAsyncData('tenant-package-menus', async () => {
  const res = await getMenuList()
  return (res.data || []) as MenuNode[]
})

const packages = computed(() => data.value || [])
const showEditor = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  description: '',
  menuCodes: [] as string[],
  enabled: true,
  sort: 0,
})

function resetForm() {
  editingId.value = null
  form.name = ''
  form.description = ''
  form.menuCodes = []
  form.enabled = true
  form.sort = 0
}

function openCreate() {
  resetForm()
  showEditor.value = true
}

function openEdit(row: TenantPackageRow) {
  editingId.value = row.id
  form.name = row.name
  form.description = row.description || ''
  form.menuCodes = [...(row.menuCodes || [])]
  form.enabled = row.enabled
  form.sort = row.sort || 0
  showEditor.value = true
}

function isChecked(code: string) {
  return form.menuCodes.includes(code)
}

function toggleMenu(code: string, checked: boolean) {
  if (checked && !form.menuCodes.includes(code))
    form.menuCodes.push(code)
  if (!checked)
    form.menuCodes = form.menuCodes.filter(item => item !== code)
}

function menuCode(node: MenuNode) {
  return node.code || node.label
}

async function savePackage() {
  if (!form.name.trim())
    return
  saving.value = true
  try {
    if (editingId.value) {
      await updateTenantPackage({ id: editingId.value, ...form })
      successToast('Tenant package updated')
    }
    else {
      await insertTenantPackage(form)
      successToast('Tenant package created')
    }
    showEditor.value = false
    await refresh()
  }
  finally {
    saving.value = false
  }
}

async function toggleEnabled(row: TenantPackageRow, enabled: boolean) {
  await updateTenantPackage({ id: row.id, enabled })
  successToast(enabled ? 'Package enabled' : 'Package disabled')
  await refresh()
}

async function deletePackage(row: TenantPackageRow) {
  const ok = await confirm({
    title: 'Delete tenant package',
    description: `Delete ${row.name}?`,
    confirmLabel: 'Delete',
    loadingLabel: 'Deleting...',
    onConfirm: async () => {
      await delTenantPackage(row.id)
      return true
    },
  })
  if (ok) {
    successToast('Tenant package deleted')
    await refresh()
  }
}

async function safeDeletePackage(row: TenantPackageRow) {
  try {
    await deletePackage(row)
  }
  catch {
    errorToast('Package is used by organizations and cannot be deleted')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold">
          Tenant Packages
        </h2>
        <p class="text-sm text-muted">
          Control tenant-visible menu scope and lifecycle limits.
        </p>
      </div>
      <UButton icon="lucide:plus" @click="openCreate">
        New Package
      </UButton>
    </div>

    <TableSkeleton v-if="pending" :cols="4" :rows="6" />
    <EmptyState
      v-else-if="packages.length === 0"
      icon="lucide:package-plus"
      title="No tenant packages"
      description="Create a package and bind it to a top-level organization."
    />
    <div v-else class="space-y-2">
      <div v-for="row in packages" :key="row.id" class="flex items-center gap-3 rounded-md border p-3">
        <UIcon name="lucide:package" class="text-primary" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate font-medium">
              {{ row.name }}
            </p>
            <UBadge :color="row.enabled ? 'success' : 'neutral'" variant="subtle">
              {{ row.enabled ? 'Enabled' : 'Disabled' }}
            </UBadge>
          </div>
          <p class="truncate text-sm text-muted">
            {{ row.description || 'No description' }}
          </p>
          <p class="text-xs text-muted">
            {{ row.menuCodes?.length || 0 }} menu codes / sort {{ row.sort }}
          </p>
        </div>
        <UCheckbox :model-value="row.enabled" label="Enabled" @update:model-value="value => toggleEnabled(row, Boolean(value))" />
        <UButton size="xs" variant="ghost" icon="lucide:edit" @click="openEdit(row)" />
        <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="safeDeletePackage(row)" />
      </div>
    </div>

    <UModal v-model:open="showEditor">
      <template #header>
        <h3 class="font-semibold">
          {{ editingId ? 'Edit Package' : 'New Package' }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" required>
            <UInput v-model="form.name" placeholder="Basic / Pro / Enterprise" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="form.description" :rows="2" />
          </UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Sort">
              <UInput v-model.number="form.sort" type="number" />
            </UFormField>
            <div class="flex items-end">
              <UCheckbox v-model="form.enabled" label="Enabled" />
            </div>
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">
              Menus
            </p>
            <div class="max-h-80 overflow-y-auto rounded-md border p-3">
              <template v-for="node in menuTree || []" :key="node.id">
                <div class="py-1">
                  <UCheckbox
                    :model-value="isChecked(menuCode(node))"
                    :label="node.label"
                    @update:model-value="value => toggleMenu(menuCode(node), Boolean(value))"
                  />
                  <div v-if="node.children?.length" class="ml-6 mt-1 space-y-1">
                    <div v-for="child in node.children" :key="child.id">
                      <UCheckbox
                        :model-value="isChecked(menuCode(child))"
                        :label="child.label"
                        @update:model-value="value => toggleMenu(menuCode(child), Boolean(value))"
                      />
                      <div v-if="child.children?.length" class="ml-6 mt-1 space-y-1">
                        <UCheckbox
                          v-for="leaf in child.children"
                          :key="leaf.id"
                          :model-value="isChecked(menuCode(leaf))"
                          :label="leaf.label"
                          @update:model-value="value => toggleMenu(menuCode(leaf), Boolean(value))"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showEditor = false">
            Cancel
          </UButton>
          <UButton :loading="saving" :disabled="!form.name.trim()" @click="savePackage">
            Save
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
