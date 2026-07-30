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

const MODEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const props = defineProps<{
  trendData: ChartData
  stackedTrendRows?: Record<string, unknown>[]
  stackedModels?: string[]
  modelData: ChartData
  consumerData: ChartData
  trendTitle: string
  modelTitle: string
  consumerTitle: string
  noTrend: string
  noModel: string
  noConsumer: string
  hasTrend: boolean
  hasModel: boolean
  hasConsumer: boolean
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

function toModelRows(data: ChartData) {
  if (Array.isArray(data)) {
    return data
  }

  const labels = data.labels ?? []
  const tokenDataset = data.datasets?.[0]
  const costDataset = data.datasets?.[1]
  return labels.map((label, index) => ({
    model: label,
    tokens: tokenDataset?.data?.[index] ?? 0,
    cost: costDataset?.data?.[index] ?? 0,
  }))
}

const trendRows = computed(() => {
  if (props.stackedTrendRows?.length)
    return props.stackedTrendRows
  return toChartRows(props.trendData, 'date', 'tokens')
})

const stackedCategories = computed(() => {
  if (!props.stackedModels?.length) {
    return { tokens: { name: props.trendTitle, color: '#3b82f6' } }
  }
  return Object.fromEntries(
    props.stackedModels.map((model, index) => [
      model,
      { name: model, color: MODEL_COLORS[index % MODEL_COLORS.length] },
    ]),
  )
})

const stackedYAxis = computed(() =>
  props.stackedModels?.length ? props.stackedModels : ['tokens'],
)

const modelRows = computed(() => toModelRows(props.modelData))
const consumerRows = computed(() => toChartRows(props.consumerData, 'principal', 'tokens'))
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
          :categories="stackedCategories"
          x-axis="date"
          :y-axis="stackedYAxis"
          :y-grid-line="true"
          :stacked="!!stackedModels?.length"
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
          :categories="{
            tokens: { name: 'Tokens', color: '#10b981' },
            cost: { name: 'Cost', color: '#f59e0b' },
          }"
          x-axis="model"
          :y-axis="['tokens', 'cost']"
          :y-grid-line="true"
          :radius="4"
        />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted">
        <p>{{ noModel }}</p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-bold">
          {{ consumerTitle }}
        </h3>
      </template>
      <div v-if="hasConsumer" class="h-64">
        <BarChart
          :data="consumerRows"
          :height="256"
          :categories="{ tokens: { name: consumerTitle, color: '#f59e0b' } }"
          x-axis="principal"
          :y-axis="['tokens']"
          :y-grid-line="true"
          :radius="4"
        />
      </div>
      <div v-else class="h-64 flex items-center justify-center text-muted">
        <p>{{ noConsumer }}</p>
      </div>
    </UCard>
  </div>
</template>
