<script setup lang="ts">
import { BarChart3, Download, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ProjectSwitcher from '../components/ProjectSwitcher.vue'
import { api, downloadCostRollup, type Organization, type UsageSummary } from '../lib/api'
import { utcDayRange } from '../lib/date-range'
import { useProjectContext } from '../lib/project-context'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const context = useProjectContext()
const data = ref<UsageSummary>({ daily: [], quotas: [] })
const organizations = ref<Organization[]>([])
const organizationID = ref('')
const loading = ref(true)
const from = ref(new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10))
const to = ref(new Date().toISOString().slice(0, 10))
const totals = computed(() =>
  data.value.daily.reduce(
    (sum, item) => ({
      calls: sum.calls + item.calls,
      llm: sum.llm + item.llm_calls,
      mcp: sum.mcp + item.mcp_calls,
      input: sum.input + item.input_tokens,
      output: sum.output + item.output_tokens,
      cost: sum.cost + item.cost_micros,
      estimated: sum.estimated + item.estimated_calls,
    }),
    { calls: 0, llm: 0, mcp: 0, input: 0, output: 0, cost: 0, estimated: 0 },
  ),
)
const filteredProjects = computed(() =>
  organizationID.value
    ? context.projects.value.filter((item) => item.organization_id === organizationID.value)
    : context.projects.value,
)
const organizationOptions = computed(() => {
  const ids = new Set(context.projects.value.map((item) => item.organization_id))
  const scoped = organizations.value.filter((item) => ids.has(item.id))
  return scoped.length ? scoped : organizations.value
})
const projectEmptyLabel = computed(() =>
  organizationID.value ? '全部项目（当前组织）' : '全部项目（权限范围内）',
)

function params() {
  const value = new URLSearchParams(utcDayRange(from.value, to.value))
  const selected = filteredProjects.value.some((item) => item.id === context.selectedID.value)
    ? context.selectedID.value
    : ''
  if (selected) value.set('project_id', selected)
  if (organizationID.value) value.set('organization_id', organizationID.value)
  return value
}

function assertDateRange() {
  if (from.value && to.value && from.value > to.value) {
    toast('开始日期不能晚于结束日期', 'error')
    return false
  }
  return true
}

async function load() {
  if (!assertDateRange()) return
  loading.value = true
  try {
    data.value = await api.usage(params())
  } catch (error) {
    toast(error instanceof Error ? error.message : '用量加载失败', 'error')
  } finally {
    loading.value = false
  }
}

async function syncProjectToFiltered() {
  if (!context.selectedID.value) return
  if (filteredProjects.value.some((item) => item.id === context.selectedID.value)) return
  await context.select('', router, route.query)
}

async function changeProject(value: string) {
  const project = context.projects.value.find((item) => item.id === value)
  if (project && organizationID.value && project.organization_id !== organizationID.value) {
    organizationID.value = project.organization_id
  }
  await context.select(value, router, route.query)
  await load()
}

async function changeOrganization() {
  await syncProjectToFiltered()
  await load()
}

async function download() {
  if (!assertDateRange()) return
  try {
    await downloadCostRollup(params())
    toast('成本汇总 CSV 已导出', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '导出失败', 'error')
  }
}

watch(filteredProjects, () => {
  void syncProjectToFiltered()
})

onMounted(async () => {
  try {
    await context.load(String(route.query.project || ''), true, true)
    await context.select(context.selectedID.value, router, route.query)
    organizations.value = await api.organizations()
    const selected = context.projects.value.find((item) => item.id === context.selectedID.value)
    if (selected) organizationID.value = selected.organization_id
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '页面加载失败', 'error')
    loading.value = false
  }
})
</script>

<template>
  <div class="page page--wide">
    <header class="page-header">
      <div>
        <span class="eyebrow">计量与财务</span>
        <h1>用量看板</h1>
        <p>按 UTC 日汇总 LLM 与 MCP 调用、Token、成本和配额利用率。</p>
      </div>
      <div class="header-actions">
        <button class="button button--secondary" @click="download"><Download :size="15" />导出成本汇总</button>
        <button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button>
      </div>
    </header>
    <div class="dashboard-filter">
      <label>
        <span>组织</span>
        <select v-model="organizationID" @change="changeOrganization">
          <option value="">全部组织</option>
          <option v-for="organization in organizationOptions" :key="organization.id" :value="organization.id">
            {{ organization.name }}
          </option>
        </select>
      </label>
      <ProjectSwitcher
        :projects="filteredProjects"
        :model-value="context.selectedID.value"
        :loading="loading"
        allow-empty
        :empty-label="projectEmptyLabel"
        @update:model-value="changeProject"
      />
      <label><span>开始日期（UTC）</span><input v-model="from" type="date" /></label>
      <label><span>结束日期（UTC）</span><input v-model="to" type="date" /></label>
      <button class="button button--primary" @click="load">查询</button>
    </div>
    <p class="filter-note">
      选择组织后项目下拉仅显示该组织项目；未选项目时汇总当前组织（或全部组织）范围内数据。结束日期按次日 00:00 UTC 排他计算。
    </p>
    <section class="metrics-strip">
      <div><span>总调用</span><strong>{{ totals.calls.toLocaleString() }}</strong></div>
      <div><span>LLM / MCP</span><strong>{{ totals.llm }} / {{ totals.mcp }}</strong></div>
      <div>
        <span>输入 / 输出 Token</span>
        <strong>{{ totals.input.toLocaleString() }} / {{ totals.output.toLocaleString() }}</strong>
      </div>
      <div><span>总成本</span><strong>${{ (totals.cost / 1_000_000).toFixed(4) }}</strong></div>
      <div><span>待估算调用</span><strong>{{ totals.estimated }}</strong></div>
    </section>
    <section class="section-block">
      <div class="section-heading">
        <div>
          <h2>每日成本汇总</h2>
          <span>合并 LLM 网关与 MCP 代理调用</span>
        </div>
      </div>
      <div v-if="loading" class="loading-block"><span class="spinner" />正在汇总</div>
      <EmptyState
        v-else-if="!data.daily.length"
        :icon="BarChart3"
        title="当前区间暂无调用"
        description="未选项目时此处为租户或权限范围内汇总。"
      />
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>组织</th>
              <th>项目</th>
              <th>LLM / MCP</th>
              <th>输入</th>
              <th>输出</th>
              <th>LLM 成本</th>
              <th>MCP 成本</th>
              <th>总成本</th>
              <th>待估算</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in data.daily"
              :key="`${item.day}-${item.organization_id}-${item.project_id}`"
            >
              <td>{{ item.day }}</td>
              <td>{{ item.organization_name || item.organization_id }}</td>
              <td>{{ item.project_name || '未归因项目' }}</td>
              <td>{{ item.llm_calls }} / {{ item.mcp_calls }}</td>
              <td>{{ item.input_tokens.toLocaleString() }}</td>
              <td>{{ item.output_tokens.toLocaleString() }}</td>
              <td>${{ (item.llm_cost_micros / 1_000_000).toFixed(6) }}</td>
              <td>${{ (item.mcp_cost_micros / 1_000_000).toFixed(6) }}</td>
              <td>${{ (item.cost_micros / 1_000_000).toFixed(6) }}</td>
              <td>{{ item.estimated_calls }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="section-block">
      <div class="section-heading">
        <div>
          <h2>配额利用率</h2>
          <span>包含已用与预留 Token</span>
        </div>
      </div>
      <div class="quota-grid">
        <article v-for="quota in data.quotas" :key="quota.scope_type + quota.scope_id">
          <header>
            <strong>{{ quota.scope_type }}</strong>
            <span>{{ quota.percent.toFixed(1) }}%</span>
          </header>
          <div class="quota-meter"><span :style="{ width: `${Math.min(100, quota.percent)}%` }" /></div>
          <small>
            {{ (quota.used_tokens + quota.reserved_tokens).toLocaleString() }} /
            {{ quota.limit_tokens.toLocaleString() }}
          </small>
        </article>
      </div>
    </section>
  </div>
</template>
