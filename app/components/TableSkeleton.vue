<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    cols?: number
  }>(),
  {
    rows: 5,
    cols: 6,
  },
)
</script>

<template>
  <div class="rounded-lg border border-default overflow-hidden">
    <div class="bg-elevated/50 border-b border-default px-4 py-3 flex gap-4">
      <USkeleton v-for="i in cols" :key="`head-${i}`" class="h-4 flex-1" />
    </div>
    <div v-for="row in rows" :key="`row-${row}`" class="px-4 py-3 flex gap-4 border-b border-default last:border-b-0">
      <USkeleton v-for="col in cols" :key="`cell-${row}-${col}`" class="h-4 flex-1" />
    </div>
  </div>
</template>
