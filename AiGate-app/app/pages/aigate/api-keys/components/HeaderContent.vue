<script setup lang="ts">
defineProps<{
  loading: boolean
  refresh: VoidFunction
  handleAdd: VoidFunction
  handleExport: VoidFunction
}>()

const keyword = defineModel<string>({ required: true })
const { t } = useI18n()
const p = (key: string) => t(`pages.aigate.apiKeys.${key}`)
</script>

<template>
  <div class="flex items-center justify-between">
    <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="refresh" />
    <div class="flex gap-2">
      <UButton icon="lucide:download" variant="outline" @click="handleExport">
        {{ $t('common.exportCsv') }}
      </UButton>
      <UButton icon="lucide:plus" @click="handleAdd">{{ p('add') }}</UButton>
    </div>
  </div>
</template>
