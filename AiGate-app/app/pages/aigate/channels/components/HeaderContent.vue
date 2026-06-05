<script setup lang="ts">
defineProps<{
  loading: boolean
  healthChecking: boolean
  refresh: VoidFunction
  handleAdd: VoidFunction
  handleExport: VoidFunction
  handleHealthCheck: VoidFunction
}>()

const keyword = defineModel<string>({ required: true })
const { t } = useI18n()
const p = (key: string) => t(`pages.aigate.channels.${key}`)
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="refresh" />
      <UButton :loading="healthChecking" icon="lucide:heart-pulse" variant="outline" size="sm" @click="handleHealthCheck">
        {{ p('healthCheck') }}
      </UButton>
    </div>
    <div class="flex gap-2">
      <UButton icon="lucide:download" variant="outline" @click="handleExport">
        {{ $t('common.exportCsv') }}
      </UButton>
      <UButton icon="lucide:plus" @click="handleAdd">
        {{ p('add') }}
      </UButton>
    </div>
  </div>
</template>
