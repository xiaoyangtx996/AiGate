<script setup lang="ts">
defineProps<{
  trendData: Record<string, unknown>
  modelData: Record<string, unknown>
  trendTitle: string
  modelTitle: string
  noTrend: string
  noModel: string
  hasTrend: boolean
  hasModel: boolean
}>()
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <UCard>
      <template #header>
        <h3 class="font-bold">{{ trendTitle }}</h3>
      </template>
      <div v-if="hasTrend" class="h-64">
        <LineChart :data="trendData" />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted">
        <p>{{ noTrend }}</p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-bold">{{ modelTitle }}</h3>
      </template>
      <div v-if="hasModel" class="h-64">
        <BarChart :data="modelData" />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted">
        <p>{{ noModel }}</p>
      </div>
    </UCard>
  </div>
</template>
