<script setup lang="ts">
const { t } = useI18n()

const hasError = ref(false)
const errorMessage = ref('')
const resetKey = ref(0)

onErrorCaptured((err) => {
  hasError.value = true
  errorMessage.value = err instanceof Error ? err.message : String(err)
  return false
})

function retry() {
  hasError.value = false
  errorMessage.value = ''
  resetKey.value++
}
</script>

<template>
  <div v-if="hasError" class="flex min-h-[50vh] items-center justify-center p-8">
    <div class="max-w-md text-center space-y-4">
      <UIcon name="lucide:triangle-alert" class="text-5xl text-error mx-auto" />
      <h2 class="text-xl font-bold">
        {{ t('errorBoundary.title') }}
      </h2>
      <p class="text-sm text-muted">
        {{ t('errorBoundary.description') }}
      </p>
      <p v-if="errorMessage" class="text-xs text-muted font-mono break-all rounded bg-elevated px-3 py-2">
        {{ errorMessage }}
      </p>
      <UButton icon="lucide:refresh-cw" @click="retry">
        {{ t('errorBoundary.retry') }}
      </UButton>
    </div>
  </div>
  <div v-else :key="resetKey">
    <slot />
  </div>
</template>
