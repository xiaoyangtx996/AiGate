<script setup lang="ts">
import { BarChart3, Bell, Bot, Building2, ChevronDown, FileText, KeyRound, LockKeyhole, LogOut, Network, ScrollText, ServerCog, ShieldCheck, Sparkles, Users } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, type Menu, type SessionInfo } from '../lib/api'
import { clearSession, session, setSession } from '../lib/session'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const info = ref<SessionInfo | null>(null)
const switching = ref(false)
const icons = { organization: Building2, keys_quota: KeyRound, logs: ScrollText, alerts: Bell, channels: ServerCog, projects: Users, knowledge: FileText, mcp: Network, skills: Sparkles, agents: Bot, usage: BarChart3, bot: Bot }
const menus = computed(() => info.value?.menus || [])
const tenant = computed(() => info.value?.tenant)
const roleLabel = computed(() => {
  if (info.value?.identity.platform) return '总公司管理员'
  const roles = info.value?.identity.roles || []
  if (roles.includes('platform_admin')) return '租户管理员'
  return [roles.includes('finance_auditor') ? '财务审计' : '', roles.includes('project_member') ? '项目成员' : ''].filter(Boolean).join(' + ') || '自定义角色'
})

async function loadSession() {
  try {
    info.value = await api.session()
    if (!menus.value.some((item) => item.path === route.path) && menus.value[0]) await router.replace(menus.value[0].path)
  } catch (error) {
    toast(error instanceof Error ? error.message : '会话加载失败', 'error')
  }
}

async function switchTenant(event: Event) {
  const tenantID = (event.target as HTMLSelectElement).value
  if (!tenantID || tenantID === tenant.value?.id) return
  switching.value = true
  try {
    const result = await api.switchTenant(tenantID)
    setSession(result.token)
    await loadSession()
    await router.replace(route.path)
    window.location.reload()
  } catch (error) {
    toast(error instanceof Error ? error.message : '租户切换失败', 'error')
  } finally { switching.value = false }
}

function icon(menu: Menu) { return icons[menu.code as keyof typeof icons] || ShieldCheck }
function logout() { clearSession(); router.replace('/login') }
onMounted(loadSession)
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand__mark"><ShieldCheck :size="20" /></span><span>AiGate</span></div>
      <label class="tenant-switch" :class="{ 'tenant-switch--static': !info?.identity.platform }" title="当前租户">
        <span class="tenant-switch__label">{{ info?.identity.platform ? '当前租户' : '所属租户' }}</span>
        <select v-if="info?.identity.platform" :value="tenant?.id" :disabled="switching" aria-label="切换租户" @change="switchTenant">
          <option v-for="item in info.tenants" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <strong v-else>{{ tenant?.name || '加载中' }}</strong>
        <ChevronDown v-if="info?.identity.platform" :size="14" aria-hidden="true" />
      </label>
      <nav aria-label="主导航">
        <RouterLink v-for="item in menus" :key="item.code" :to="item.path" class="nav-item" :class="{ active: route.path === item.path }">
          <component :is="icon(item)" :size="18" /><span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar__footer">
        <div class="session-user">
          <span class="avatar">{{ (info?.identity.display_name || session.claims.display_name || 'A').slice(0, 1) }}</span>
          <span><strong>{{ roleLabel }}</strong><small>{{ info?.identity.display_name || session.claims.sub?.slice(0, 12) }}</small></span>
        </div>
        <button class="icon-button icon-button--dark" title="退出登录" @click="logout"><LogOut :size="18" /></button>
      </div>
    </aside>
    <main class="workspace"><RouterView v-if="info && menus.length" /><div v-else-if="info" class="access-empty"><LockKeyhole :size="24" /><strong>当前账号没有管理菜单</strong><span>请联系租户管理员分配管理角色。</span></div><div v-else class="loading-block"><span class="spinner" />正在加载权限</div></main>
  </div>
</template>
