<script setup lang="ts">
interface ComboItem {
  id?: string
  channelId: string
  modelName: string
  sort?: number
}

interface ComboRecord {
  id: string
  name: string
  description?: string | null
  enabled: boolean
  items?: ComboItem[]
}

const {
  getComboList,
  insertCombo,
  updateCombo,
  delCombo,
  getChannelList,
} = useAigateApi()
const { successToast } = useAppToast()
const confirm = useConfirmDialog()
const { i18nCommon } = useMessage()

const {
  data: combosData,
  pending: loading,
  refresh,
} = await useAsyncData('aigate-gateway-combos', async () => {
  const res = await getComboList()
  return res.data ?? []
})

const { data: channelsData } = await useAsyncData('aigate-combo-channels', async () => {
  const res = await getChannelList({ page: 1, pageSize: 100 })
  return res.data?.items ?? []
})

const combos = computed<ComboRecord[]>(() => (combosData.value || []) as ComboRecord[])
const channels = computed<any[]>(() => channelsData.value || [])
const channelOptions = computed(() =>
  channels.value.map(item => ({
    label: `${item.name} / ${item.vendor}`,
    value: item.id,
  })),
)

const open = ref(false)
const saveLoading = ref(false)
const editData = ref<ComboRecord | null>(null)
const form = reactive({
  name: '',
  description: '',
  enabled: true,
  items: [] as ComboItem[],
})

function channelName(channelId: string) {
  const found = channels.value.find(item => item.id === channelId)
  return found ? `${found.name} / ${found.vendor}` : channelId
}

function modelOptions(channelId: string) {
  const found = channels.value.find(item => item.id === channelId)
  const models = Array.isArray(found?.models) ? found.models : []
  return models.map((model: string) => ({ label: model, value: model }))
}

function resetForm(row?: ComboRecord) {
  editData.value = row ?? null
  form.name = row?.name ?? ''
  form.description = row?.description ?? ''
  form.enabled = row?.enabled ?? true
  form.items = row?.items?.length
    ? row.items
        .slice()
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map(item => ({ channelId: item.channelId, modelName: item.modelName }))
    : [{ channelId: '', modelName: '' }]
}

function handleAdd() {
  resetForm()
  open.value = true
}

function handleEdit(row: ComboRecord) {
  resetForm(row)
  open.value = true
}

function addItem() {
  form.items.push({ channelId: '', modelName: '' })
}

function removeItem(index: number) {
  if (form.items.length === 1) {
    form.items[0] = { channelId: '', modelName: '' }
    return
  }
  form.items.splice(index, 1)
}

function moveItem(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= form.items.length)
    return
  const [item] = form.items.splice(index, 1)
  if (item)
    form.items.splice(target, 0, item)
}

const dragIndex = ref<number | null>(null)

function dragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function dropItem(index: number, event: DragEvent) {
  event.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index)
    return
  const [item] = form.items.splice(dragIndex.value, 1)
  if (item)
    form.items.splice(index, 0, item)
  dragIndex.value = null
}

function dragEnd() {
  dragIndex.value = null
}

function isValid() {
  return Boolean(form.name.trim()) && form.items.every(item => item.channelId && item.modelName)
}

async function handleSubmit() {
  if (!isValid())
    return
  saveLoading.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      enabled: form.enabled,
      items: form.items.map((item, index) => ({ ...item, sort: index })),
    }
    if (editData.value) {
      await updateCombo({ ...payload, id: editData.value.id })
    }
    else {
      await insertCombo(payload)
    }
    successToast()
    open.value = false
    await refresh()
  }
  finally {
    saveLoading.value = false
  }
}

async function handleDelete(row: ComboRecord) {
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      await delCombo(row.id)
      return true
    },
  })
  if (confirmed) {
    successToast(i18nCommon('deleteSuccess'))
    await refresh()
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold">
          Combo 回退链
        </h2>
        <p class="text-sm text-muted">
          将多个渠道模型编排成一个可被网关 model 参数直接命中的回退链。
        </p>
      </div>
      <UButton v-permission="'ADD'" icon="lucide:plus" @click="handleAdd">
        新增 Combo
      </UButton>
    </div>

    <TableSkeleton v-if="loading" :cols="4" :rows="3" />
    <EmptyState
      v-else-if="combos.length === 0"
      icon="lucide:git-branch"
      title="暂无 Combo"
      description="创建 Combo 后，可在网关请求中直接使用 Combo 名称作为 model。"
    >
      <template #action>
        <UButton v-permission="'ADD'" icon="lucide:plus" @click="handleAdd">
          新增 Combo
        </UButton>
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <UCard v-for="combo in combos" :key="combo.id">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-bold truncate">
                {{ combo.name }}
              </h3>
              <UBadge :color="combo.enabled ? 'success' : 'neutral'" variant="subtle" size="sm">
                {{ combo.enabled ? '启用' : '停用' }}
              </UBadge>
            </div>
            <p class="text-sm text-muted truncate">
              {{ combo.description || '未填写描述' }}
            </p>
          </div>
          <div class="flex gap-1">
            <UButton v-permission="'EDIT'" size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(combo)" />
            <UButton
              v-permission="'DELETE'"
              size="xs"
              color="error"
              variant="ghost"
              icon="lucide:trash-2"
              @click="handleDelete(combo)"
            />
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <div
            v-for="(item, index) in combo.items || []"
            :key="`${combo.id}-${item.channelId}-${item.modelName}-${index}`"
            class="flex items-center gap-2 rounded-md border border-default px-3 py-2 text-sm"
          >
            <span class="flex h-6 w-6 items-center justify-center rounded bg-muted font-mono text-xs">
              {{ index + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">
                {{ channelName(item.channelId) }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ item.modelName }}
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ editData ? '编辑 Combo' : '新增 Combo' }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="form.name" placeholder="如：main-chain" />
          </UFormField>
          <UFormField label="描述">
            <UInput v-model="form.description" placeholder="用于说明该回退链的使用场景" />
          </UFormField>
          <UFormField label="状态">
            <USwitch v-model="form.enabled" label="启用" />
          </UFormField>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium">
                回退链路
              </h4>
              <UButton size="xs" variant="outline" icon="lucide:plus" @click="addItem">
                添加
              </UButton>
            </div>
            <div
              v-for="(item, index) in form.items"
              :key="index"
              draggable="true"
              class="rounded-md border border-default p-3 transition-colors"
              :class="dragIndex === index ? 'border-primary bg-muted/40' : ''"
              @dragstart="dragStart(index, $event)"
              @dragover.prevent
              @drop="dropItem(index, $event)"
              @dragend="dragEnd"
            >
              <div class="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto] gap-2">
                <div class="flex items-center pt-6">
                  <UIcon name="lucide:grip-vertical" class="cursor-grab text-muted" />
                </div>
                <UFormField label="渠道" required>
                  <USelect v-model="item.channelId" :items="channelOptions" placeholder="选择渠道" />
                </UFormField>
                <UFormField label="模型" required>
                  <UInput
                    v-if="modelOptions(item.channelId).length === 0"
                    v-model="item.modelName"
                    placeholder="输入模型名"
                  />
                  <USelect v-else v-model="item.modelName" :items="modelOptions(item.channelId)" placeholder="选择模型" />
                </UFormField>
                <div class="flex items-end gap-1">
                  <UButton size="xs" variant="ghost" icon="lucide:arrow-up" :disabled="index === 0" @click="moveItem(index, -1)" />
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="lucide:arrow-down"
                    :disabled="index === form.items.length - 1"
                    @click="moveItem(index, 1)"
                  />
                  <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="removeItem(index)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">
            取消
          </UButton>
          <UButton :loading="saveLoading" :disabled="!isValid()" @click="handleSubmit">
            保存
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
