<script setup lang="ts">
interface ChartJsDataset {
  label?: string
  data?: number[]
}

interface ChartJsData {
  labels?: string[]
  datasets?: ChartJsDataset[]
}

type ChartData = Record<string, unknown>[] | ChartJsData

const props = defineProps<{
  trendData: ChartData
  modelData: ChartData
  trendTitle: string
  modelTitle: string
  noTrend: string
  noModel: string
  hasTrend: boolean
  hasModel: boolean
}>()

function toChartRows(data: ChartData, labelKey: string, valueKey: string) {
  if (Array.isArray(data)) {
    return data
  }

  const dataset = data.datasets?.[0]
  return (data.labels ?? []).map((label, index) => ({
    [labelKey]: label,
    [valueKey]: dataset?.data?.[index] ?? 0,
  }))
}

const trendRows = computed(() => toChartRows(props.trendData, 'date', 'tokens'))
const modelRows = computed(() => toChartRows(props.modelData, 'model', 'tokens'))
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <UCard>
      <template #header>
        <h3 class="font-bold">
          {{ trendTitle }}
        </h3>
      </template>
      <div v-if="hasTrend" class="h-64">
        <LineChart
          :data="trendRows"
          :height="256"
          :categories="{ tokens: { name: trendTitle, color: '#3b82f6' } }"
          x-axis="date"
          :y-axis="['tokens']"
          :y-grid-line="true"
        />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted">
        <p>{{ noTrend }}</p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-bold">
          {{ modelTitle }}
        </h3>
      </template>
      <div v-if="hasModel" class="h-64">
        <BarChart
          :data="modelRows"
          :height="256"
          :categories="{ tokens: { name: modelTitle, color: '#10b981' } }"
          x-axis="model"
          :y-axis="['tokens']"
          :y-grid-line="true"
          :radius="4"
        />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted">
        <p>{{ noModel }}</p>
      </div>
    </UCard>
  </div>
</template>
