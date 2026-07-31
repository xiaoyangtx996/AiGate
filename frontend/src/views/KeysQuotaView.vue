<script setup lang="ts">
import { Ban, Check, Copy, FlaskConical, KeyRound, Plus, RefreshCw, ShieldAlert, Trash2, WalletCards } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import UiModal from '../components/UiModal.vue'
import { api, gatewaySmoke, type APIKey, type Organization, type Project, type User } from '../lib/api'
import { session } from '../lib/session'
import { toast } from '../lib/toast'

const keys = ref<APIKey[]>([])
const organizations = ref<Organization[]>([])
const users = ref<User[]>([])
const projects = ref<Project[]>([])
const loading = ref(true)
const keyModal = ref(false)
const secretModal = ref(false)
const issuedSecret = ref('')
const saving = ref(false)
const keyForm = reactive({ user_id: '', name: '', allowed: '' })
const quotaForm = reactive({ scope: 'tenant', scope_id: '', limit_tokens: 10000 })
const smoke = reactive({ apiKey: '', projectID: '', model: 'gpt-4o-mini', prompt: '用一句话确认网关可用。', loading: false, status: 0, traceID: '', message: '' })
const userMap = computed(() => Object.fromEntries(users.value.map((item) => [item.id, item])))
const organizationMap = computed(() => Object.fromEntries(organizations.value.map((item) => [item.id, item.name])))
const quotaTargets = computed(() => quotaForm.scope === 'organization' ? organizations.value : quotaForm.scope === 'user' ? users.value : [])

watch(() => quotaForm.scope, (scope) => {
  quotaForm.scope_id = scope === 'tenant' ? session.claims.tenant_id || '' : quotaTargets.value[0]?.id || ''
})

async function load() {
  loading.value = true
  try {
    ;[keys.value, organizations.value, users.value, projects.value] = await Promise.all([api.keys(), api.organizations(), api.users(), api.projectContexts()])
    if (!quotaForm.scope_id) quotaForm.scope_id = session.claims.tenant_id || ''
  } catch (error) {
    toast(error instanceof Error ? error.message : '密钥数据加载失败', 'error')
  } finally { loading.value = false }
}

function openKeyModal() {
  Object.assign(keyForm, { user_id: users.value[0]?.id || '', name: '', allowed: '' })
  keyModal.value = true
}

async function createKey() {
  const user = userMap.value[keyForm.user_id]
  if (!user) return
  saving.value = true
  try {
    const result = await api.createKey({ organization_id: user.organization_id, user_id: user.id, name: keyForm.name, allowed_cidrs: keyForm.allowed.split(',').map((item) => item.trim()).filter(Boolean) })
    issuedSecret.value = result.secret
    smoke.apiKey = result.secret
    keyModal.value = false
    secretModal.value = true
    toast('密钥已签发', 'success')
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '密钥创建失败', 'error')
  } finally { saving.value = false }
}

async function copySecret() {
  await navigator.clipboard.writeText(issuedSecret.value)
  toast('密钥已复制', 'success')
}

async function revoke(item: APIKey) {
  if (!window.confirm(`撤销密钥“${item.name}”？`)) return
  try { await api.revokeKey(item.id); toast('密钥已撤销', 'success'); await load() }
  catch (error) { toast(error instanceof Error ? error.message : '撤销失败', 'error') }
}

async function saveQuota() {
  saving.value = true
  try { await api.setQuota(quotaForm.scope, quotaForm.scope_id, quotaForm.limit_tokens); toast('配额已保存', 'success') }
  catch (error) { toast(error instanceof Error ? error.message : '配额保存失败', 'error') }
  finally { saving.value = false }
}

async function runSmoke() {
  smoke.loading = true; smoke.status = 0; smoke.message = ''; smoke.traceID = ''
  try {
    const result = await gatewaySmoke(smoke)
    smoke.status = result.status; smoke.traceID = result.traceID
    const error = (result.body as { error?: { message?: string; code?: string } }).error
    smoke.message = error ? `${error.code || 'error'}：${error.message || '请求被拒绝'}` : '网关调用成功'
    toast(smoke.message, result.status >= 400 ? 'error' : 'success')
  } catch (error) { smoke.message = error instanceof Error ? error.message : '网关调用失败'; toast(smoke.message, 'error') }
  finally { smoke.loading = false }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-header"><div><span class="eyebrow">访问控制</span><h1>密钥与配额</h1><p>签发员工密钥并维护三级 Token 配额。</p></div><div class="header-actions"><button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button><button class="button button--primary" :disabled="!users.length" @click="openKeyModal"><Plus :size="16" />签发密钥</button></div></header>

    <div class="two-column">
      <section class="section-block">
        <div class="section-heading"><div><h2>员工密钥</h2><span>{{ keys.filter((item) => item.active).length }} 个有效</span></div></div>
        <div v-if="keys.length" class="key-list">
          <article v-for="item in keys" :key="item.id" class="list-card"><span class="list-card__icon"><KeyRound :size="18" /></span><div class="list-card__main"><div><strong>{{ item.name }}</strong><span class="status" :class="item.active ? 'status--success' : 'status--muted'">{{ item.active ? '有效' : '已撤销' }}</span></div><code>{{ item.prefix }}••••••••</code><small>{{ userMap[item.user_id]?.display_name || item.user_id.slice(0, 8) }} · {{ organizationMap[item.organization_id] || '未分配' }}</small></div><button v-if="item.active" class="icon-button icon-button--danger" title="撤销密钥" @click="revoke(item)"><Trash2 :size="16" /></button></article>
        </div>
        <EmptyState v-else-if="!loading" :icon="KeyRound" title="暂无密钥" description="为员工签发首个 API Key。" />
      </section>

      <section class="tool-panel">
        <div class="section-heading"><div><h2>配额编辑</h2><span>租户 → 部门 → 员工</span></div><WalletCards :size="20" /></div>
        <form class="form-stack" @submit.prevent="saveQuota">
          <div class="segmented" role="group" aria-label="配额层级"><button v-for="item in [{id:'tenant',label:'租户'},{id:'organization',label:'部门'},{id:'user',label:'员工'}]" :key="item.id" type="button" :class="{ active: quotaForm.scope === item.id }" @click="quotaForm.scope = item.id">{{ item.label }}</button></div>
          <label v-if="quotaForm.scope !== 'tenant'"><span>{{ quotaForm.scope === 'organization' ? '部门' : '员工' }}</span><select v-model="quotaForm.scope_id" required><option v-for="item in quotaTargets" :key="item.id" :value="item.id">{{ 'display_name' in item ? item.display_name : item.name }}</option></select></label>
          <label v-else><span>当前租户</span><input :value="quotaForm.scope_id" readonly /></label>
          <label><span>Token 上限</span><input v-model.number="quotaForm.limit_tokens" required type="number" min="0" step="1" /></label>
          <p class="inline-notice"><ShieldAlert :size="16" />下级配额总和不得超过上级；额度不得低于已用量。</p>
          <button class="button button--primary button--full" :disabled="saving || !quotaForm.scope_id"><Check :size="16" />保存配额</button>
        </form>
      </section>
    </div>

    <section class="smoke-panel">
      <div class="section-heading"><div><h2>网关验证</h2><span>OpenAI Chat Completions</span></div><FlaskConical :size="20" /></div>
      <form class="smoke-grid" @submit.prevent="runSmoke"><label><span>员工 API Key</span><input v-model.trim="smoke.apiKey" required type="password" autocomplete="off" placeholder="ag_..." /></label><label><span>归因项目（可选）</span><select v-model="smoke.projectID"><option value="">未归因</option><option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option></select></label><label><span>模型</span><input v-model.trim="smoke.model" required /></label><label class="smoke-grid__prompt"><span>测试消息</span><input v-model.trim="smoke.prompt" required /></label><button class="button button--secondary" :disabled="smoke.loading"><FlaskConical :size="16" />{{ smoke.loading ? '请求中' : '发起调用' }}</button></form>
      <div v-if="smoke.status" class="smoke-result" :class="smoke.status >= 400 ? 'smoke-result--blocked' : 'smoke-result--ok'"><component :is="smoke.status >= 400 ? Ban : Check" :size="18" /><strong>HTTP {{ smoke.status }}</strong><span>{{ smoke.message }}</span><code v-if="smoke.traceID">{{ smoke.traceID }}</code></div>
    </section>

    <UiModal v-if="keyModal" title="签发员工密钥" @close="keyModal = false"><form class="form-stack" @submit.prevent="createKey"><label><span>员工</span><select v-model="keyForm.user_id" required><option v-for="user in users" :key="user.id" :value="user.id">{{ user.display_name }} · {{ user.email }}</option></select></label><label><span>密钥名称</span><input v-model.trim="keyForm.name" required placeholder="例如：研发环境" /></label><label><span>IP 白名单（可选）</span><input v-model.trim="keyForm.allowed" placeholder="10.0.0.0/8, 192.168.1.20/32" /></label><div class="modal-actions"><button type="button" class="button button--ghost" @click="keyModal = false">取消</button><button class="button button--primary" :disabled="saving">签发</button></div></form></UiModal>
    <UiModal v-if="secretModal" title="密钥仅显示一次" @close="secretModal = false"><div class="secret-box"><code>{{ issuedSecret }}</code><button class="icon-button" title="复制密钥" @click="copySecret"><Copy :size="17" /></button></div><div class="modal-actions"><button class="button button--primary" @click="secretModal = false">我已保存</button></div></UiModal>
  </div>
</template>
