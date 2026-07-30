<script setup lang="ts">
import { Building2, Plus, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import UiModal from '../components/UiModal.vue'
import { api, type MenuSetting, type Organization, type Role, type User } from '../lib/api'
import { toast } from '../lib/toast'

const organizations = ref<Organization[]>([])
const users = ref<User[]>([])
const roles = ref<Role[]>([])
const menuSettings = ref<MenuSetting[]>([])
const loading = ref(true)
const userModal = ref(false)
const organizationModal = ref(false)
const roleModal = ref(false)
const saving = ref(false)
const organizationForm = reactive({ name: '' })
const roleForm = reactive({ code: '', name: '', description: '' })
const userForm = reactive({ organization_id: '', email: '', display_name: '', password: '', active: true, role_ids: [] as string[] })
const organizationNames = computed(() => Object.fromEntries(organizations.value.map((item) => [item.id, item.name])))

async function load() {
  loading.value = true
  try {
    ;[organizations.value, users.value, roles.value, menuSettings.value] = await Promise.all([api.organizations(), api.users(), api.roles(), api.menuSettings()])
  } catch (error) {
    toast(error instanceof Error ? error.message : '组织数据加载失败', 'error')
  } finally {
    loading.value = false
  }
}

async function toggleMenu(item: MenuSetting) {
  const next = !item.enabled
  try {
    await api.setMenuEnabled(item.code, next)
    item.enabled = next
    toast('租户菜单已更新，刷新后生效', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '菜单设置失败', 'error')
  }
}

function openUserModal() {
  Object.assign(userForm, { organization_id: organizations.value[0]?.id || '', email: '', display_name: '', password: '', active: true, role_ids: [] })
  userModal.value = true
}

async function createUser() {
  saving.value = true
  try {
    await api.createUser(userForm)
    userModal.value = false
    toast('用户已创建', 'success')
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '用户创建失败', 'error')
  } finally {
    saving.value = false
  }
}

async function createOrganization() {
  saving.value = true
  try {
    await api.createOrganization(organizationForm.name)
    organizationModal.value = false
    organizationForm.name = ''
    toast('部门已创建', 'success')
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '部门创建失败', 'error')
  } finally {
    saving.value = false
  }
}

async function createRole() {
  saving.value = true
  try {
    await api.createRole(roleForm)
    roleModal.value = false
    Object.assign(roleForm, { code: '', name: '', description: '' })
    toast('角色已创建', 'success')
    await load()
  } catch (error) { toast(error instanceof Error ? error.message : '角色创建失败', 'error') }
  finally { saving.value = false }
}

async function removeRole(role: Role) {
  if (['platform_admin', 'project_member'].includes(role.code) || !window.confirm(`删除角色“${role.name}”？`)) return
  try { await api.deleteRole(role.id); toast('角色已删除', 'success'); await load() }
  catch (error) { toast(error instanceof Error ? error.message : '角色删除失败', 'error') }
}

async function removeUser(user: User) {
  if (!window.confirm(`删除用户“${user.display_name}”？`)) return
  try {
    await api.deleteUser(user.id)
    toast('用户已删除', 'success')
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '删除失败', 'error')
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-header"><div><span class="eyebrow">身份与组织</span><h1>组织与用户</h1><p>管理租户内部门与员工账户。</p></div><button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button></header>

    <section class="summary-band">
      <div><span class="summary-icon"><Building2 :size="20" /></span><span><small>部门</small><strong>{{ organizations.length }}</strong></span></div>
      <div><span class="summary-icon summary-icon--alt"><Users :size="20" /></span><span><small>用户</small><strong>{{ users.length }}</strong></span></div>
      <div class="summary-band__actions"><button class="button button--secondary" @click="organizationModal = true"><Plus :size="16" />新建部门</button><button class="button button--primary" :disabled="!organizations.length" @click="openUserModal"><UserPlus :size="16" />新建用户</button></div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><h2>部门</h2><span>组织层级 stub</span></div></div>
      <div class="chip-list"><span v-for="organization in organizations" :key="organization.id" class="org-chip"><Building2 :size="15" /><strong>{{ organization.name }}</strong><code>{{ organization.id.slice(0, 8) }}</code></span><span v-if="loading" class="skeleton-line" /></div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><h2>租户菜单</h2><span>按租户独立启停，不改变角色权限</span></div></div>
      <div class="menu-setting-list"><label v-for="item in menuSettings" :key="item.code" class="menu-setting"><span><strong>{{ item.label }}</strong><small>{{ item.path }}</small></span><input type="checkbox" :checked="item.enabled" :disabled="item.code === 'organization'" @change="toggleMenu(item)" /></label></div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><h2>角色</h2><span>{{ roles.length }} 个租户角色</span></div><button class="button button--secondary" @click="roleModal = true"><Plus :size="16" />新建角色</button></div>
      <div class="role-grid"><article v-for="role in roles" :key="role.id" class="role-card"><span class="summary-icon"><ShieldCheck :size="18" /></span><div><strong>{{ role.name }}</strong><code>{{ role.code }}</code><small>{{ role.description || '暂无描述' }}</small></div><button v-if="!['platform_admin','project_member'].includes(role.code)" class="icon-button icon-button--danger" title="删除角色" @click="removeRole(role)"><Trash2 :size="15" /></button></article></div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><h2>用户</h2><span>{{ users.length }} 个账户</span></div></div>
      <div v-if="users.length" class="table-wrap">
        <table><thead><tr><th>用户</th><th>部门</th><th>状态</th><th>创建时间</th><th class="cell-actions">操作</th></tr></thead>
          <tbody><tr v-for="user in users" :key="user.id"><td><div class="identity-cell"><span class="avatar avatar--light">{{ user.display_name.slice(0, 1) }}</span><span><strong>{{ user.display_name }}</strong><small>{{ user.email }}</small></span></div></td><td>{{ organizationNames[user.organization_id] || '未分配' }}</td><td><span class="status" :class="user.active ? 'status--success' : 'status--muted'">{{ user.active ? '启用' : '停用' }}</span></td><td>{{ new Date(user.created_at).toLocaleDateString('zh-CN') }}</td><td class="cell-actions"><button class="icon-button icon-button--danger" title="删除用户" @click="removeUser(user)"><Trash2 :size="16" /></button></td></tr></tbody>
        </table>
      </div>
      <EmptyState v-else-if="!loading" :icon="Users" title="暂无用户" description="创建首个员工账户后会显示在这里。" />
    </section>

    <UiModal v-if="organizationModal" title="新建部门" @close="organizationModal = false">
      <form class="form-stack" @submit.prevent="createOrganization"><label><span>部门名称</span><input v-model.trim="organizationForm.name" required maxlength="80" placeholder="例如：研发中心" /></label><div class="modal-actions"><button type="button" class="button button--ghost" @click="organizationModal = false">取消</button><button class="button button--primary" :disabled="saving">保存部门</button></div></form>
    </UiModal>

    <UiModal v-if="userModal" title="新建用户" @close="userModal = false">
      <form class="form-stack" @submit.prevent="createUser">
        <label><span>姓名</span><input v-model.trim="userForm.display_name" required placeholder="员工姓名" /></label>
        <label><span>邮箱</span><input v-model.trim="userForm.email" required type="email" placeholder="name@example.com" /></label>
        <label><span>所属部门</span><select v-model="userForm.organization_id" required><option v-for="item in organizations" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        <label><span>初始密码</span><input v-model="userForm.password" required type="password" minlength="8" autocomplete="new-password" /></label>
        <fieldset><legend>角色</legend><label v-for="role in roles" :key="role.id" class="check-row"><input v-model="userForm.role_ids" type="checkbox" :value="role.id" /><span><strong>{{ role.name }}</strong><small>{{ role.description }}</small></span></label></fieldset>
        <label class="check-row check-row--compact"><input v-model="userForm.active" type="checkbox" /><span>创建后立即启用</span></label>
        <div class="modal-actions"><button type="button" class="button button--ghost" @click="userModal = false">取消</button><button class="button button--primary" :disabled="saving || !userForm.role_ids.length">创建用户</button></div>
      </form>
    </UiModal>
    <UiModal v-if="roleModal" title="新建租户角色" @close="roleModal = false"><form class="form-stack" @submit.prevent="createRole"><label><span>角色代码</span><input v-model.trim="roleForm.code" required pattern="[a-z0-9_]+" placeholder="finance_auditor" /></label><label><span>角色名称</span><input v-model.trim="roleForm.name" required placeholder="财务审计" /></label><label><span>职责描述</span><input v-model.trim="roleForm.description" placeholder="可查看费用与调用日志" /></label><div class="modal-actions"><button type="button" class="button button--ghost" @click="roleModal = false">取消</button><button class="button button--primary" :disabled="saving">创建角色</button></div></form></UiModal>
  </div>
</template>
