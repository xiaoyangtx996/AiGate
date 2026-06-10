<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title?: string
    description?: string
  }>(),
  {
    icon: 'lucide:inbox',
  },
)

const { t } = useI18n()
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
