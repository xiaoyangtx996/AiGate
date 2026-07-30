<script setup lang="ts">
import { Download, RefreshCw, ScrollText, Search } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import { api, downloadLogs, type APILog } from '../lib/api'
import { toast } from '../lib/toast'

const today = new Date()
const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
const formatDate = (value: Date) => value.toISOString().slice(0, 10)
const filters = reactive({ from: formatDate(weekAgo), to: formatDate(today), blocked: '' })
const logs = ref<APILog[]>([])
const loading = ref(true)
const exporting = ref(false)
const totalTokens = computed(() => logs.value.reduce((sum, item) => sum + item.total_tokens, 0))
const blockedCount = computed(() => logs.value.filter((item) => item.blocked).length)

function params(limit = 200) {
  const result = new URLSearchParams({ limit: String(limit) })
  if (filters.from) result.set('from', new Date(`${filters.from}T00:00:00`).toISOString())
  if (filters.to) result.set('to', new Date(`${filters.to}T23:59:59.999`).toISOString())
  if (filters.blocked) result.set('blocked', filters.blocked)
  return result
}

async function load() {
  loading.value = true
  try { logs.value = await api.logs(params()) }
  catch (error) { toast(error instanceof Error ? error.message : '日志加载失败', 'error') }
  finally { loading.value = false }
}

async function exportCSV() {
  exporting.value = true
  try { await downloadLogs(params(1000)); toast('CSV 已导出', 'success') }
  catch (error) { toast(error instanceof Error ? error.message : '导出失败', 'error') }
  finally { exporting.value = false }
}

function money(micros: number | null) {
  if (micros === null) return '待估算'
  return `$${(micros / 1_000_000).toFixed(6)}`
}

onMounted(load)
</script>

<template>
  <div class="page page--wide">
    <header class="page-header"><div><span class="eyebrow">计量与审计</span><h1>调用日志</h1><p>按日期检查网关调用、成本与配额拦截。</p></div><button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button></header>
    <form class="filter-bar" @submit.prevent="load"><label><span>开始日期</span><input v-model="filters.from" type="date" /></label><label><span>结束日期</span><input v-model="filters.to" type="date" /></label><label><span>调用结果</span><select v-model="filters.blocked"><option value="">全部</option><option value="false">已放行</option><option value="true">已拦截</option></select></label><button class="button button--secondary"><Search :size="16" />查询</button><button type="button" class="button button--ghost" :disabled="exporting" @click="exportCSV"><Download :size="16" />导出 CSV</button></form>
    <section class="metrics-strip"><div><span>当前结果</span><strong>{{ logs.length }}</strong></div><div><span>Token 总量</span><strong>{{ totalTokens.toLocaleString() }}</strong></div><div><span>配额拦截</span><strong class="metric-danger">{{ blockedCount }}</strong></div></section>
    <section class="section-block section-block--flush">
      <div v-if="logs.length" class="table-wrap"><table class="table--dense"><thead><tr><th>时间 / Trace</th><th>模型</th><th>Token</th><th>成本</th><th>结果</th><th>状态码</th></tr></thead><tbody>
        <tr v-for="item in logs" :key="item.id"><td><div class="stacked-cell"><strong>{{ new Date(item.created_at).toLocaleString('zh-CN') }}</strong><code :title="item.trace_id">{{ item.trace_id.slice(0, 18) }}{{ item.trace_id.length > 18 ? '…' : '' }}</code></div></td><td>{{ item.model }}</td><td><div class="token-cell"><strong>{{ item.total_tokens.toLocaleString() }}</strong><small>入 {{ item.input_tokens }} / 出 {{ item.output_tokens }}</small></div></td><td><span>{{ money(item.cost_micros) }}</span><small v-if="item.estimated" class="estimate-tag">估算</small></td><td><span class="status" :class="item.blocked ? 'status--danger' : item.status_code >= 400 ? 'status--warning' : 'status--success'">{{ item.blocked ? '配额拦截' : item.status_code >= 400 ? '上游失败' : '成功' }}</span><small v-if="item.error_code" class="error-code">{{ item.error_code }}</small></td><td><code>{{ item.status_code }}</code></td></tr>
      </tbody></table></div>
      <EmptyState v-else-if="!loading" :icon="ScrollText" title="当前区间没有日志" description="调整日期或调用结果后重新查询。" />
      <div v-else class="loading-block"><span class="spinner" />正在读取调用日志</div>
    </section>
  </div>
</template>
