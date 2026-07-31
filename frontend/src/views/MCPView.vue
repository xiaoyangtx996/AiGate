<script setup lang="ts">
import { Network, RefreshCw, ShieldCheck } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ProjectSwitcher from '../components/ProjectSwitcher.vue'
import { api, type MCPAsset, type MarketplaceEntry } from '../lib/api'
import { useProjectContext } from '../lib/project-context'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const context = useProjectContext()
const assets = ref<MCPAsset[]>([])
const granted = ref<MCPAsset[]>([])
const market = ref<MarketplaceEntry[]>([])
const loading = ref(true)
const saving = ref(false)
const form = reactive({ name: '', endpoint: '', credential: '', version: '' })

function grantedIDs() {
  return new Set(granted.value.map((item) => item.id))
}

async function load() {
  loading.value = true
  try {
    ;[assets.value, market.value] = await Promise.all([api.mcpAssets(), api.marketplace()])
    await loadGrants()
  } catch (error) {
    toast(error instanceof Error ? error.message : 'MCP 数据加载失败', 'error')
  } finally {
    loading.value = false
  }
}

async function loadGrants() {
  granted.value = context.selectedID.value ? await api.projectMCPAssets(context.selectedID.value) : []
}

async function changeProject(value: string) {
  await context.select(value, router, route.query)
  try {
    await loadGrants()
  } catch (error) {
    toast(error instanceof Error ? error.message : '项目授权加载失败', 'error')
  }
}

async function register() {
  saving.value = true
  try {
    await api.registerMCP(form)
    Object.assign(form, { name: '', endpoint: '', credential: '', version: '' })
    toast('私有 MCP 已注册', 'success')
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '注册失败', 'error')
  } finally {
    saving.value = false
  }
}

async function install(item: MarketplaceEntry) {
  saving.value = true
  try {
    await api.installMCP(item.id)
    toast('已安装到租户目录；仍需授权到项目', 'success')
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '安装失败', 'error')
  } finally {
    saving.value = false
  }
}

async function grant(asset: MCPAsset) {
  if (!context.selectedID.value) return
  try {
    await api.grantMCP(context.selectedID.value, asset.id)
    await loadGrants()
    toast('已授权当前项目调用', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '项目授权失败', 'error')
  }
}

onMounted(async () => {
  try {
    await context.load(String(route.query.project || ''))
    await context.select(context.selectedID.value, router, route.query)
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
        <span class="eyebrow">企业资产</span>
        <h1>MCP 管理</h1>
        <p>安装到租户目录不代表项目可调用，必须显式授权。</p>
      </div>
      <button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button>
    </header>
    <ProjectSwitcher
      :projects="context.projects.value"
      :model-value="context.selectedID.value"
      :loading="loading"
      @update:model-value="changeProject"
    />
    <section class="two-column section-block">
      <form class="tool-panel form-stack" @submit.prevent="register">
        <div class="section-heading">
          <div>
            <h2>注册私有 MCP</h2>
            <span>端点和凭据由后端加密保存</span>
          </div>
        </div>
        <label><span>名称</span><input v-model.trim="form.name" required /></label>
        <label><span>端点</span><input v-model.trim="form.endpoint" required placeholder="https://..." /></label>
        <label><span>凭据</span><input v-model="form.credential" type="password" autocomplete="off" /></label>
        <label><span>版本</span><input v-model.trim="form.version" /></label>
        <button class="button button--primary" :disabled="saving">注册</button>
      </form>
      <section class="tool-panel">
        <div class="section-heading">
          <div>
            <h2>公共市场</h2>
            <span>安装后进入租户目录</span>
          </div>
        </div>
        <div class="compact-list">
          <article v-for="item in market" :key="item.id">
            <div>
              <strong>{{ item.name }}</strong>
              <small>{{ item.description }} · {{ item.version }}</small>
            </div>
            <button class="button button--secondary" @click="install(item)">安装</button>
          </article>
        </div>
      </section>
    </section>
    <section class="section-block">
      <div class="section-heading">
        <div>
          <h2>租户目录与项目授权</h2>
          <span>当前项目：{{ context.current.value?.name || '未选择' }}</span>
        </div>
      </div>
      <div v-if="loading" class="loading-block"><span class="spinner" />正在加载 MCP</div>
      <EmptyState
        v-else-if="!assets.length"
        :icon="Network"
        title="暂无 MCP 资产"
        description="注册私有端点或从公共市场安装。"
      />
      <div v-else class="list-grid">
        <article v-for="asset in assets" :key="asset.id" class="list-card">
          <span class="list-card__icon"><Network :size="18" /></span>
          <div class="list-card__main">
            <div>
              <strong>{{ asset.name }}</strong>
              <span
                class="status"
                :class="asset.health_status === 'healthy' ? 'status--success' : asset.health_status === 'unhealthy' ? 'status--danger' : 'status--warning'"
              >{{ asset.health_status }}</span>
            </div>
            <small>{{ asset.source }} · {{ asset.version || '未标版本' }}</small>
          </div>
          <span v-if="grantedIDs().has(asset.id)" class="status status--success"><ShieldCheck :size="12" />已授权</span>
          <button
            v-else
            class="button button--secondary"
            :disabled="!context.selectedID.value"
            @click="grant(asset)"
          >授权当前项目</button>
        </article>
      </div>
    </section>
  </div>
</template>
