<script setup lang="ts">
const { getModelList, insertModel, updateModel, delModel } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
type ModelStatusColor = 'success' | 'neutral' | 'warning'

const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'aigate-models',
  async () => {
    const res = await getModelList({
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

const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)
const form = reactive({
  name: '',
  provider: '',
  type: 'chat',
  contextWindow: 4096,
  inputPrice: 0,
  outputPrice: 0,
  status: 'available',
})
const statusColor: Record<string, ModelStatusColor> = {
  available: 'success',
  deprecated: 'neutral',
  maintenance: 'warning',
}
const getStatusColor = (status: string): ModelStatusColor => statusColor[status] || 'neutral'

function formatPrice(price?: number | null) {
  return `¥${Number(price || 0).toFixed(8)}/1K`
}

function handleSearch() {
  page.value = 1
  refresh()
}

function resetForm(row?: any) {
  editData.value = row ?? null
  form.name = row?.name ?? ''
  form.provider = row?.provider ?? ''
  form.type = row?.type ?? 'chat'
  form.contextWindow = row?.contextWindow ?? 4096
  form.inputPrice = row?.inputPrice ?? 0
  form.outputPrice = row?.outputPrice ?? 0
  form.status = row?.status ?? 'available'
}

function handleAdd() {
  resetForm()
  open.value = true
}

function handleEdit(row: any) {
  resetForm(row)
  open.value = true
}

async function handleDelete(id: string) {
  await delModel(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.name || !form.provider)
    return
  saveLoading.value = true
  try {
    if (editData.value?.id) {
      await updateModel({ ...form, id: editData.value.id })
    }
    else {
      await insertModel({ ...form })
    }
    successToast()
    open.value = false
    refresh()
  }
  finally {
    saveLoading.value = false
  }
}

const p = (key: string) => t(`pages.aigate.models.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <UButton icon="lucide:plus" @click="handleAdd">
        新增模型
      </UButton>
    </div>
    <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="handleSearch" />
    <TableSkeleton v-if="loading" :cols="3" :rows="3" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:box"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard v-for="model in list" :key="model.id" class="hover:border-primary transition-colors">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-bold">
                {{ model.name }}
              </h3>
              <p class="text-sm text-muted">
                {{ model.provider }}
              </p>
            </div>
            <UBadge :color="getStatusColor(model.status)" variant="subtle" size="sm">
              {{ model.status }}
            </UBadge>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">{{ p('type') }}</span><span>{{ model.type }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('context') }}</span><span class="font-mono">{{ model.contextWindow?.toLocaleString() }} tokens</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('inputPrice') }}</span><span class="font-mono">{{ formatPrice(model.inputPrice) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('outputPrice') }}</span><span class="font-mono">{{ formatPrice(model.outputPrice) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">来源渠道</span><span>{{ model.sourceChannelName || '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">同步时间</span><span class="text-xs">{{ model.updatedAt ? new Date(model.updatedAt).toLocaleString() : '-' }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-1 mt-3">
            <UBadge v-for="f in model.features || []" :key="f" variant="outline" size="xs">
              {{ f }}
            </UBadge>
          </div>
          <div class="flex justify-end gap-1 mt-4">
            <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(model)" />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="lucide:trash-2"
              @click="handleDelete(model.id)"
            />
          </div>
        </UCard>
      </div>
      <div v-if="total > 0" class="flex justify-end">
        <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
      </div>
    </template>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ editData ? $t('common.save') : '新增模型' }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="Provider" required>
            <UInput v-model="form.provider" />
          </UFormField>
          <UFormField :label="p('type')">
            <USelect
              v-model="form.type"
              :items="[
                { label: 'Chat', value: 'chat' },
                { label: 'Embedding', value: 'embedding' },
                { label: 'Rerank', value: 'rerank' },
                { label: 'Image', value: 'image' },
                { label: 'Speech', value: 'speech' },
              ]"
            />
          </UFormField>
          <UFormField :label="p('context')">
            <UInput v-model.number="form.contextWindow" type="number" min="1" />
          </UFormField>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UFormField :label="p('inputPrice')">
              <UInput v-model.number="form.inputPrice" type="number" min="0" step="0.00000001" />
            </UFormField>
            <UFormField :label="p('outputPrice')">
              <UInput v-model.number="form.outputPrice" type="number" min="0" step="0.00000001" />
            </UFormField>
          </div>
          <UFormField label="Status">
            <USelect
              v-model="form.status"
              :items="[
                { label: 'Available', value: 'available' },
                { label: 'Deprecated', value: 'deprecated' },
                { label: 'Maintenance', value: 'maintenance' },
              ]"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="saveLoading" :disabled="!form.name || !form.provider" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
