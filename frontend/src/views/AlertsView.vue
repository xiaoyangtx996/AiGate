<script setup lang="ts">
import { Bell, BellRing, Check, RefreshCw, Settings2, Webhook } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import UiModal from '../components/UiModal.vue'
import { api, type Alert, type AlertPolicy, type Organization, type User } from '../lib/api'
import { session } from '../lib/session'
import { toast } from '../lib/toast'

const alerts = ref<Alert[]>([])
const organizations = ref<Organization[]>([])
const users = ref<User[]>([])
const policy = ref<AlertPolicy | null>(null)
const loading = ref(true)
const policyModal = ref(false)
const saving = ref(false)
const form = reactive({ thresholds: '70, 90, 100', webhook_url: '', cooldown_seconds: 3600, enabled: true })
const scopeNames = computed(() => ({ [session.claims.tenant_id || '']: '当前租户', ...Object.fromEntries(organizations.value.map((item) => [item.id, item.name])), ...Object.fromEntries(users.value.map((item) => [item.id, item.display_name])) }))

async function load() {
  loading.value = true
  try { ;[alerts.value, policy.value, organizations.value, users.value] = await Promise.all([api.alerts(), api.alertPolicy(), api.organizations(), api.users()]) }
  catch (error) { toast(error instanceof Error ? error.message : '告警加载失败', 'error') }
  finally { loading.value = false }
}

function openPolicy() {
  if (policy.value) Object.assign(form, { thresholds: policy.value.thresholds.join(', '), webhook_url: policy.value.webhook_url, cooldown_seconds: policy.value.cooldown_seconds, enabled: policy.value.enabled })
  policyModal.value = true
}

async function savePolicy() {
  const thresholds = form.thresholds.split(',').map(Number).filter((value) => Number.isInteger(value))
  saving.value = true
  try { await api.saveAlertPolicy({ ...form, thresholds }); policyModal.value = false; toast('告警策略已保存', 'success'); await load() }
  catch (error) { toast(error instanceof Error ? error.message : '策略保存失败', 'error') }
  finally { saving.value = false }
}

function scopeLabel(item: Alert) {
  return `${item.scope_type === 'tenant' ? '租户' : item.scope_type === 'organization' ? '部门' : '员工'} · ${scopeNames.value[item.scope_id] || item.scope_id.slice(0, 8)}`
}

function deliveryLabel(status: string) {
  return ({ delivered: '已投递', failed: '投递失败', pending: '等待投递', not_configured: '仅记录' } as Record<string, string>)[status] || status
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-header"><div><span class="eyebrow">配额通知</span><h1>告警收件箱</h1><p>查看租户、部门和员工的阈值告警。</p></div><div class="header-actions"><button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button><button class="button button--secondary" @click="openPolicy"><Settings2 :size="16" />告警策略</button></div></header>
    <section v-if="policy" class="policy-strip"><div><BellRing :size="20" /><span><small>启用阈值</small><strong>{{ policy.thresholds.join('% · ') }}%</strong></span></div><div><Webhook :size="20" /><span><small>Webhook</small><strong>{{ policy.webhook_url ? '已配置' : '未配置' }}</strong></span></div><div><span><small>去重窗口</small><strong>{{ policy.cooldown_seconds / 60 }} 分钟</strong></span></div></section>
    <section class="section-block">
      <div class="section-heading"><div><h2>阈值告警</h2><span>{{ alerts.length }} 条记录</span></div></div>
      <div v-if="alerts.length" class="alert-list"><article v-for="item in alerts" :key="item.id" class="alert-row"><span class="alert-row__level">{{ item.threshold }}<small>%</small></span><div class="alert-row__main"><div><strong>{{ scopeLabel(item) }}</strong><span class="status" :class="item.delivery_status === 'failed' ? 'status--danger' : item.delivery_status === 'delivered' ? 'status--success' : 'status--warning'">{{ deliveryLabel(item.delivery_status) }}</span></div><p>已使用 {{ item.used_tokens.toLocaleString() }} / {{ item.limit_tokens.toLocaleString() }} Token，当前 {{ item.usage_percent.toFixed(1) }}%</p><small>{{ new Date(item.created_at).toLocaleString('zh-CN') }}</small><code v-if="item.last_error">{{ item.last_error }}</code></div></article></div>
      <EmptyState v-else-if="!loading" :icon="Bell" title="暂无配额告警" description="达到策略阈值后，告警会进入收件箱。" />
      <div v-else class="loading-block"><span class="spinner" />正在读取告警</div>
    </section>
    <UiModal v-if="policyModal" title="告警策略" @close="policyModal = false"><form class="form-stack" @submit.prevent="savePolicy"><label><span>阈值（百分比）</span><input v-model.trim="form.thresholds" required placeholder="70, 90, 100" /></label><label><span>Webhook URL</span><input v-model.trim="form.webhook_url" type="url" placeholder="https://example.com/aigate-alerts" /></label><label><span>去重窗口（秒）</span><input v-model.number="form.cooldown_seconds" required type="number" min="60" /></label><label class="check-row check-row--compact"><input v-model="form.enabled" type="checkbox" /><span>启用配额告警</span></label><div class="modal-actions"><button type="button" class="button button--ghost" @click="policyModal = false">取消</button><button class="button button--primary" :disabled="saving"><Check :size="16" />保存策略</button></div></form></UiModal>
  </div>
</template>
