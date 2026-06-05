<script setup lang="ts">
defineProps<{
  loading: boolean
  refresh: VoidFunction
  handleExport: VoidFunction
}>()

const { t } = useI18n()
const p = (key: string) => t(`pages.aigate.apiLogs.${key}`)
</script>

<template>
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold">{{ $t('menu.apiLogs') }}</h2>
    <div class="flex gap-2">
      <UButton icon="lucide:download" variant="outline" @click="handleExport">
        {{ $t('common.exportCsv') }}
      </UButton>
      <UButton variant="outline" icon="lucide:refresh-cw" :loading="loading" @click="refresh">
        {{ p('refresh') }}
      </UButton>
    </div>
  </div>
</template>
