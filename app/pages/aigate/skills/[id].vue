<script setup lang="ts">
interface SkillFile {
  id: string
  path: string
  content: string
  primary?: boolean
}

const route = useRoute()
const router = useRouter()
const { getSkill, insertSkillFile, updateSkillFile, delSkillFile } = useAigateApi()
const { successToast } = useAppToast()
const confirm = useConfirmDialog()
const id = computed(() => route.params.id as string)

const { data, pending, refresh } = await useAsyncData(
  () => `aigate-skill-${id.value}`,
  async () => {
    const res = await getSkill(id.value)
    return res.data as { id: string, name: string, description?: string, files: SkillFile[] } | null
  },
  { watch: [id] },
)

const files = computed(() => data.value?.files || [])
const selectedFileId = ref('skill-md')
const selectedFile = computed(() => files.value.find(file => file.id === selectedFileId.value) || files.value[0])
const editor = ref('')
const saving = ref(false)
const showNewFile = ref(false)
const newFile = reactive({ path: '', content: '' })
const renamingFileId = ref<string | null>(null)
const renamePath = ref('')
const renameSaving = ref(false)

watch(
  selectedFile,
  (file) => {
    editor.value = file?.content || ''
  },
  { immediate: true },
)

async function saveFile() {
  const file = selectedFile.value
  if (!file)
    return
  saving.value = true
  try {
    await updateSkillFile({ id: id.value, fileId: file.id, path: file.path, content: editor.value })
    successToast('Saved')
    await refresh()
  }
  finally {
    saving.value = false
  }
}

async function createFile() {
  if (!newFile.path.trim())
    return
  await insertSkillFile(id.value, { path: newFile.path, content: newFile.content })
  successToast('File created')
  showNewFile.value = false
  newFile.path = ''
  newFile.content = ''
  await refresh()
}

async function deleteFile(file: SkillFile) {
  if (file.primary)
    return
  const ok = await confirm({
    title: 'Delete file',
    description: `Delete ${file.path}?`,
    confirmLabel: 'Delete',
    loadingLabel: 'Deleting...',
    onConfirm: async () => {
      await delSkillFile(id.value, file.id)
      return true
    },
  })
  if (ok) {
    selectedFileId.value = 'skill-md'
    successToast('File deleted')
    await refresh()
  }
}

function startRename(file: SkillFile) {
  if (file.primary)
    return
  renamingFileId.value = file.id
  renamePath.value = file.path
}

function cancelRename() {
  renamingFileId.value = null
  renamePath.value = ''
}

async function commitRename(file: SkillFile) {
  const nextPath = renamePath.value.trim()
  if (!nextPath || nextPath === file.path) {
    cancelRename()
    return
  }
  renameSaving.value = true
  try {
    await updateSkillFile({ id: id.value, fileId: file.id, path: nextPath, content: file.content })
    successToast('Renamed')
    cancelRename()
    await refresh()
  }
  finally {
    renameSaving.value = false
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-120px)] gap-4">
    <aside class="w-72 shrink-0 space-y-3 border-r pr-4">
      <div class="flex items-center gap-2">
        <UButton variant="ghost" icon="lucide:arrow-left" @click="router.push('/aigate/skills')" />
        <div class="min-w-0">
          <h2 class="truncate font-semibold">
            {{ data?.name || 'Skill' }}
          </h2>
          <p class="truncate text-xs text-muted">
            {{ data?.description || 'No description' }}
          </p>
        </div>
      </div>

      <UButton block icon="lucide:file-plus" variant="outline" @click="showNewFile = true">
        New File
      </UButton>

      <TableSkeleton v-if="pending" :cols="1" :rows="6" />
      <div v-else class="space-y-1">
        <button
          v-for="file in files"
          :key="file.id"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
          :class="selectedFileId === file.id ? 'bg-muted font-medium' : ''"
          @click="selectedFileId = file.id"
        >
          <UIcon :name="file.primary ? 'lucide:badge-check' : 'lucide:file-text'" class="shrink-0" />
          <UInput
            v-if="renamingFileId === file.id"
            v-model="renamePath"
            size="xs"
            class="min-w-0 flex-1"
            @click.stop
            @keyup.enter="commitRename(file)"
            @keyup.esc="cancelRename"
          />
          <span v-else class="min-w-0 flex-1 truncate">{{ file.path }}</span>
          <UButton
            v-if="renamingFileId === file.id"
            size="xs"
            variant="ghost"
            icon="lucide:check"
            :loading="renameSaving"
            @click.stop="commitRename(file)"
          />
          <UButton
            v-else-if="!file.primary"
            size="xs"
            variant="ghost"
            icon="lucide:pencil"
            @click.stop="startRename(file)"
          />
          <UButton
            v-if="!file.primary && renamingFileId !== file.id"
            size="xs"
            variant="ghost"
            color="error"
            icon="lucide:trash-2"
            @click.stop="deleteFile(file)"
          />
        </button>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate font-semibold">
            {{ selectedFile?.path || 'No file selected' }}
          </h3>
          <p class="text-xs text-muted">
            Text files only
          </p>
        </div>
        <UButton icon="lucide:save" :loading="saving" :disabled="!selectedFile" @click="saveFile">
          Save
        </UButton>
      </div>
      <SkillCodeEditor v-model="editor" class="min-h-0 flex-1" />
    </main>

    <UModal v-model:open="showNewFile">
      <template #header>
        <h3 class="font-semibold">
          New File
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Path" required>
            <UInput v-model="newFile.path" placeholder="references/example.md" />
          </UFormField>
          <UFormField label="Content">
            <UTextarea v-model="newFile.content" :rows="8" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showNewFile = false">
            Cancel
          </UButton>
          <UButton :disabled="!newFile.path.trim()" @click="createFile">
            Create
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
