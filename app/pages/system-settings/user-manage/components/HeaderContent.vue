<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

defineProps<{
  table: Table<User>
  refresh: VoidFunction
  handleAdd: VoidFunction
  handleImport: VoidFunction
  loading: boolean
}>()

const { i18nCommon } = useMessage()

const query = defineModel<Pick<UserQueryParams, 'keyword'>>({ required: true })
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <UInput
        v-model="query.keyword"
        icon="lucide:search"
        variant="outline"
        :placeholder="i18nCommon('searchKeyword')"
      />
      <AutoFormSearchButton :loading @refresh="refresh" />
      <UButton icon="lucide:upload" variant="outline" @click="handleImport">
        Import CSV
      </UButton>
      <AutoFormAddButton @add="handleAdd" />
    </div>
    <TableColumnVisibility v-if="table" :table="table" />
  </div>
</template>
