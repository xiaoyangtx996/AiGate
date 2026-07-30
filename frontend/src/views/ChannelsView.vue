<script setup lang="ts">
import { Check, KeyRound, Pencil, Plus, RefreshCw, ServerCog } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import UiModal from '../components/UiModal.vue'
import { api, type Channel } from '../lib/api'
import { toast } from '../lib/toast'

const channels = ref<Channel[]>([])
const loading = ref(true)
const modal = ref(false)
const saving = ref(false)
const editingID = ref('')
const form = reactive({ name: '', base_url: '', credential: '', active: true })

async function load() {
  loading.value = true
  try { channels.value = await api.channels() }
  catch (error) { toast(error instanceof Error ? error.message : '渠道加载失败', 'error') }
  finally { loading.value = false }
}

function create() {
  editingID.value = ''
  Object.assign(form, { name: '', base_url: '', credential: '', active: channels.value.length === 0 })
  modal.value = true
}

function edit(item: Channel) {
  editingID.value = item.id
  Object.assign(form, { name: item.name, base_url: item.base_url, credential: '', active: item.active })
  modal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editingID.value) {
      const payload: Record<string, string | boolean> = { name: form.name, base_url: form.base_url, active: form.active }
      if (form.credential) payload.credential = form.credential
      await api.updateChannel(editingID.value, payload)
    } else {
      await api.createChannel(form)
    }
    form.credential = ''
    modal.value = false
    toast(editingID.value ? '渠道已更新，凭证仍保持隐藏' : '渠道已创建', 'success')
    await load()
  } catch (error) { toast(error instanceof Error ? error.message : '渠道保存失败', 'error') }
  finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-header"><div><span class="eyebrow">上游连接</span><h1>渠道凭证</h1><p>维护 NewAPI sidecar 地址与加密凭证。</p></div><div class="header-actions"><button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button><button class="button button--primary" @click="create"><Plus :size="16" />添加渠道</button></div></header>
    <section class="section-block">
      <div class="section-heading"><div><h2>上游渠道</h2><span>{{ channels.length }} 个配置</span></div></div>
      <div v-if="channels.length" class="channel-grid"><article v-for="item in channels" :key="item.id" class="channel-card"><header><span class="list-card__icon"><ServerCog :size="19" /></span><span class="status" :class="item.active ? 'status--success' : 'status--muted'">{{ item.active ? '启用' : '停用' }}</span></header><div><h3>{{ item.name }}</h3><code>{{ item.base_url }}</code></div><footer><span><KeyRound :size="15" />凭证已加密保存</span><button class="icon-button" title="编辑渠道" @click="edit(item)"><Pencil :size="16" /></button></footer></article></div>
      <EmptyState v-else-if="!loading" :icon="ServerCog" title="暂无上游渠道" description="添加 NewAPI sidecar 后即可配置网关路由。" />
      <div v-else class="loading-block"><span class="spinner" />正在读取渠道</div>
    </section>
    <UiModal v-if="modal" :title="editingID ? '编辑渠道' : '添加渠道'" @close="modal = false"><form class="form-stack" @submit.prevent="save"><label><span>渠道名称</span><input v-model.trim="form.name" required placeholder="NewAPI 主渠道" /></label><label><span>Base URL</span><input v-model.trim="form.base_url" required type="url" placeholder="http://localhost:3000" /></label><label><span>{{ editingID ? '更新凭证（留空保持不变）' : '上游凭证' }}</span><input v-model="form.credential" :required="!editingID" type="password" autocomplete="new-password" placeholder="输入后将加密保存" /></label><label class="check-row check-row--compact"><input v-model="form.active" type="checkbox" /><span>启用此渠道</span></label><div class="credential-note"><KeyRound :size="16" /><span>保存后控制台与 API 均不回显明文凭证。</span></div><div class="modal-actions"><button type="button" class="button button--ghost" @click="modal = false">取消</button><button class="button button--primary" :disabled="saving"><Check :size="16" />保存渠道</button></div></form></UiModal>
  </div>
</template>
