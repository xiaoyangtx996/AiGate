<script setup lang="ts">
withDefaults(defineProps<{
  count?: number
}>(), {
  count: 4,
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <UCard v-for="i in count" :key="i">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1 space-y-2">
          <USkeleton class="h-5 w-2/3" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-4/5" />
        </div>
        <USkeleton class="h-5 w-14 rounded-full" />
      </div>
      <div class="flex flex-wrap gap-1 mb-3">
        <USkeleton v-for="j in 3" :key="j" class="h-5 w-12 rounded-full" />
      </div>
      <div class="flex gap-2">
        <USkeleton class="h-8 flex-1 rounded-md" />
        <USkeleton class="h-8 w-8 rounded-md" />
        <USkeleton class="h-8 w-8 rounded-md" />
      </div>
    </UCard>
  </div>
</template>
