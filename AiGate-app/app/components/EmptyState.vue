<script setup lang="ts">
const { t } = useI18n()

withDefaults(defineProps<{
  icon?: string
  title?: string
  description?: string
}>(), {
  icon: 'lucide:inbox',
})
</script>

<template>
  <UEmpty
    :icon="icon"
    :title="title ?? t('common.emptyTitle')"
    :description="description ?? t('common.emptyDescription')"
  >
    <template v-if="$slots.action" #actions>
      <slot name="action" />
    </template>
  </UEmpty>
</template>
