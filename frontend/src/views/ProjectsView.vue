<script setup lang="ts">
import { FolderKanban, RefreshCw, Trash2, UserPlus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ProjectSwitcher from '../components/ProjectSwitcher.vue'
import { api, type Organization, type Project, type User } from '../lib/api'
import { useProjectContext } from '../lib/project-context'
import { session } from '../lib/session'
import { toast } from '../lib/toast'

const projects = ref<Project[]>([])
const route = useRoute(), router = useRouter(), context = useProjectContext()
const organizations = ref<Organization[]>([])
const members = ref<Record<string, User[]>>({})
const candidates = ref<Record<string, User[]>>({})
const loading = ref(true)
const saving = ref(false)
const membershipBusy = ref(false)
const form = reactive({ name: '', organization_id: '' })
const selectedUsers = reactive<Record<string, string>>({})
const organizationNames = computed(() => Object.fromEntries(organizations.value.map((item) => [item.id, item.name])))
const isAdmin = computed(() => Boolean(session.claims.platform || session.claims.roles?.includes('platform_admin')))

function selectedProjectID() {
  const candidate = String(route.query.project || '') || context.selectedID.value
  return projects.value.some((item) => item.id === candidate) ? candidate : (projects.value[0]?.id || '')
}

async function loadMembershipMaps() {
  ;[members.value, candidates.value] = await Promise.all([
    api.projectMembersBatch(),
    api.projectMemberCandidatesBatch(),
  ])
}

async function refreshProjectMembership(project: Project) {
  ;[members.value[project.id], candidates.value[project.id]] = await Promise.all([
    api.projectMembers(project.id),
    api.projectMemberCandidates(project.id),
  ])
}

async function load() {
  loading.value = true
  try {
    if (!isAdmin.value) {
      projects.value = await api.projectContexts()
      context.projects.value = projects.value
      await context.select(selectedProjectID(), router, route.query)
      await loadMembershipMaps()
      return
    }
    ;[projects.value, organizations.value] = await Promise.all([api.projects(), api.organizations()])
    if (!form.organization_id) form.organization_id = organizations.value[0]?.id || ''
    await loadMembershipMaps()
    context.projects.value = projects.value
    await context.select(selectedProjectID(), router, route.query)
  } catch (error) {
    toast(error instanceof Error ? error.message : '项目数据加载失败', 'error')
  } finally {
    loading.value = false
  }
}

async function createProject() {
  saving.value = true
  try {
    await api.createProject(form)
    form.name = ''
    toast('项目已创建，创建者已自动加入项目', 'success')
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : '项目创建失败', 'error')
  } finally {
    saving.value = false
  }
}

async function grant(project: Project) {
  const userID = selectedUsers[project.id]
  if (!userID || membershipBusy.value) return
  membershipBusy.value = true
  try {
    await api.grantProject(project.id, userID)
    await refreshProjectMembership(project)
    selectedUsers[project.id] = ''
    toast('项目成员已授予', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '成员授权失败', 'error')
  } finally {
    membershipBusy.value = false
  }
}

async function revoke(project: Project, user: User) {
  if (membershipBusy.value) return
  if (!window.confirm(`撤销 ${user.display_name || user.email} 的项目访问权？`)) return
  membershipBusy.value = true
  try {
    await api.revokeProject(project.id, user.id)
    await refreshProjectMembership(project)
    toast('项目成员已撤销', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '成员撤销失败', 'error')
  } finally {
    membershipBusy.value = false
  }
}

function availableUsers(projectID: string) {
  return candidates.value[projectID] || []
}

onMounted(load)
async function changeProject(value: string) {
  await context.select(value, router, route.query)
}
</script>

<template>
  <div class="page page--wide">
    <header class="page-header">
      <div>
        <span class="eyebrow">项目资产</span>
        <h1>项目管理</h1>
        <p>项目是知识库、MCP 与 Agent 的资产容器。</p>
      </div>
      <button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button>
    </header>
    <ProjectSwitcher
      v-if="projects.length"
      :projects="projects"
      :model-value="context.selectedID.value"
      :loading="loading"
      @update:model-value="changeProject"
    />
    <p v-if="!isAdmin && projects.length" class="filter-note">
      当前 MVP 中项目成员均可管理其已加入项目的成员；独立 project_lead 权限将在后续里程碑引入。
    </p>
    <section v-if="isAdmin" class="tool-panel section-block">
      <div class="section-heading">
        <div>
          <h2>新建项目</h2>
          <span>创建后自动授予当前管理员项目成员权限</span>
        </div>
      </div>
      <form class="form-grid project-create" @submit.prevent="createProject">
        <label><span>项目名称</span><input v-model.trim="form.name" required placeholder="例如：客服知识助手" /></label>
        <label>
          <span>所属部门</span>
          <select v-model="form.organization_id" required>
            <option v-for="organization in organizations" :key="organization.id" :value="organization.id">
              {{ organization.name }}
            </option>
          </select>
        </label>
        <button class="button button--primary" :disabled="saving || !organizations.length">创建项目</button>
      </form>
    </section>
    <div v-if="loading" class="loading-block"><span class="spinner" />正在加载项目</div>
    <EmptyState v-else-if="!projects.length" :icon="FolderKanban" title="暂无项目" description="先创建部门，再创建首个项目。" />
    <section v-else class="project-list">
      <article v-for="project in projects" :key="project.id" class="project-row">
        <header>
          <div>
            <strong>{{ project.name }}</strong>
            <span>{{ organizationNames[project.organization_id] || project.organization_id }}</span>
          </div>
          <nav>
            <RouterLink :to="`/knowledge?project=${project.id}`">知识库</RouterLink>
            <RouterLink v-if="isAdmin" :to="`/mcp?project=${project.id}`">MCP</RouterLink>
            <RouterLink :to="`/agents?project=${project.id}`">Agent</RouterLink>
          </nav>
        </header>
        <div class="member-list">
          <span v-for="member in members[project.id] || []" :key="member.id" class="member-chip">
            <span>{{ member.display_name || member.email }}</span>
            <button title="撤销成员" @click="revoke(project, member)"><Trash2 :size="13" /></button>
          </span>
          <small v-if="!(members[project.id] || []).length">暂无成员</small>
        </div>
        <form class="member-grant" @submit.prevent="grant(project)">
          <select v-model="selectedUsers[project.id]">
            <option value="">选择员工</option>
            <option v-for="user in availableUsers(project.id)" :key="user.id" :value="user.id">
              {{ user.display_name || user.email }}
            </option>
          </select>
          <button class="button button--secondary" :disabled="!selectedUsers[project.id] || membershipBusy">
            <UserPlus :size="15" />授予成员
          </button>
        </form>
      </article>
    </section>
  </div>
</template>
