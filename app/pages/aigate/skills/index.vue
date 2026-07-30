<script setup lang="ts">
interface SkillRow {
  id: string
  name: string
  description?: string | null
  version: number
  enabled: boolean
  hasFiles: boolean
  updatedAt?: string
}

const { getSkillList, insertSkill, updateSkill, delSkill } = useAigateApi()
const { successToast, errorToast } = useAppToast()
const confirm = useConfirmDialog()

const { data, pending, refresh } = await useAsyncData('aigate-skills', async () => {
  const res = await getSkillList({ page: 1, pageSize: 100 })
  return (res.data?.items ?? []) as SkillRow[]
})

const skills = computed(() => data.value || [])
const showCreate = ref(false)
const createLoading = ref(false)
const importLoading = ref(false)
const fileInput = ref<HTMLInputElement>()
const form = reactive({
  name: '',
  description: '',
})

async function createSkill() {
  if (!form.name.trim())
    return
  createLoading.value = true
  try {
    await insertSkill({ name: form.name, description: form.description })
    successToast('Skill created')
    showCreate.value = false
    form.name = ''
    form.description = ''
    await refresh()
  }
  finally {
    createLoading.value = false
  }
}

async function toggleSkill(item: SkillRow, enabled: boolean) {
  await updateSkill({ id: item.id, enabled })
  successToast(enabled ? 'Skill enabled' : 'Skill disabled')
  await refresh()
}

async function deleteSkill(item: SkillRow) {
  const ok = await confirm({
    title: 'Delete skill',
    description: `Delete ${item.name}?`,
    confirmLabel: 'Delete',
    loadingLabel: 'Deleting...',
    onConfirm: async () => {
      await delSkill(item.id)
      return true
    },
  })
  if (ok) {
    successToast('Skill deleted')
    await refresh()
  }
}

function chooseImportFile() {
  fileInput.value?.click()
}

async function importSkill(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length === 0)
    return

  importLoading.value = true
  try {
    const formData = new FormData()
    for (const file of files)
      formData.append('file', file)
    await $fetch('/api/aigate/skill/import', { method: 'POST', body: formData })
    successToast('Skill imported')
    await refresh()
  }
  catch {
    errorToast('Import failed')
  }
  finally {
    importLoading.value = false
    if (fileInput.value)
      fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold">
          Skills
        </h2>
        <p class="text-sm text-muted">
          Manage reusable SKILL.md instructions and supporting text files.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton icon="lucide:upload" variant="outline" :loading="importLoading" @click="chooseImportFile">
          Import
        </UButton>
        <UButton icon="lucide:plus" @click="showCreate = true">
          New Skill
        </UButton>
        <input ref="fileInput" class="hidden" type="file" multiple accept=".zip,.md,.txt,.json" @change="importSkill">
      </div>
    </div>

    <TableSkeleton v-if="pending" :cols="3" :rows="6" />
    <EmptyState
      v-else-if="skills.length === 0"
      icon="lucide:sparkles"
      title="No skills"
      description="Create or import a skill to bind it to Agents."
    />
    <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="item in skills" :key="item.id" class="h-full">
        <div class="flex h-full flex-col gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate font-semibold">
                {{ item.name }}
              </h3>
              <p class="line-clamp-2 text-sm text-muted">
                {{ item.description || 'No description' }}
              </p>
            </div>
            <UBadge :color="item.enabled ? 'success' : 'neutral'" variant="subtle">
              v{{ item.version }}
            </UBadge>
          </div>

          <div class="flex items-center gap-2 text-xs text-muted">
            <UIcon :name="item.hasFiles ? 'lucide:folder' : 'lucide:file-text'" />
            <span>{{ item.hasFiles ? 'Includes files' : 'SKILL.md only' }}</span>
          </div>

          <div class="mt-auto flex items-center justify-between gap-2">
            <UCheckbox
              :model-value="item.enabled"
              label="Enabled"
              @update:model-value="value => toggleSkill(item, Boolean(value))"
            />
            <div class="flex gap-1">
              <UButton size="xs" variant="ghost" icon="lucide:edit" :to="`/aigate/skills/${item.id}`" />
              <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="deleteSkill(item)" />
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="showCreate">
      <template #header>
        <h3 class="font-semibold">
          New Skill
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name" required>
            <UInput v-model="form.name" placeholder="e.g. Code Review Skill" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="form.description" :rows="3" placeholder="Describe when this skill should be used" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showCreate = false">
            Cancel
          </UButton>
          <UButton :loading="createLoading" :disabled="!form.name.trim()" @click="createSkill">
            Create
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
