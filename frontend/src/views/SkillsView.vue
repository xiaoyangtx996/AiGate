<script setup lang="ts">
import { RefreshCw, Sparkles } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ProjectSwitcher from '../components/ProjectSwitcher.vue'
import { api, type SkillAsset, type SkillMemory } from '../lib/api'
import { useProjectContext } from '../lib/project-context'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const context = useProjectContext()
const skills = ref<SkillAsset[]>([])
const granted = ref<SkillAsset[]>([])
const memories = ref<SkillMemory[]>([])
const loading = ref(true)
const saving = ref(false)
const form = reactive({ name: '', description: '', instructions: '', hook: {} })
const versionText = reactive<Record<string, string>>({})

const grantedIDs = () => new Set(granted.value.map((item) => item.id))

async function load() {
  loading.value = true
  try {
    skills.value = await api.skills()
    granted.value = context.selectedID.value ? await api.projectSkills(context.selectedID.value) : []
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Skill 数据加载失败', 'error')
  } finally { loading.value = false }
}

async function changeProject(value: string) {
  await context.select(value, router, route.query)
  await load()
}

async function create() {
  saving.value = true
  try {
    await api.createSkill(form)
    Object.assign(form, { name: '', description: '', instructions: '', hook: {} })
    toast('Skill 已创建', 'success')
    await load()
  } catch (error) { toast(error instanceof Error ? error.message : '创建失败', 'error') }
  finally { saving.value = false }
}

async function grant(skill: SkillAsset) {
  if (!context.selectedID.value) return
  try { await api.grantSkill(context.selectedID.value, skill.id); await load(); toast('已授权当前项目', 'success') }
  catch (error) { toast(error instanceof Error ? error.message : '授权失败', 'error') }
}

async function newVersion(skill: SkillAsset) {
  const instructions = versionText[skill.id]?.trim()
  if (!instructions) return
  try { await api.createSkillVersion(skill.id, { instructions, activate: true }); versionText[skill.id] = ''; await load(); toast('已创建并激活新版本', 'success') }
  catch (error) { toast(error instanceof Error ? error.message : '版本创建失败', 'error') }
}

async function inspect(skill: SkillAsset) {
  try { memories.value = await api.skillMemories(skill.id) }
  catch (error) { toast(error instanceof Error ? error.message : '记忆加载失败', 'error') }
}

async function optimize(skill: SkillAsset) {
  try { await api.optimizeSkill(skill.id); toast('优化任务已入队；不会修改激活版本', 'success') }
  catch (error) { toast(error instanceof Error ? error.message : '入队失败', 'error') }
}

onMounted(async () => { await context.load(String(route.query.project || '')); await context.select(context.selectedID.value, router, route.query); await load() })
</script>

<template>
  <div class="page page--wide">
    <header class="page-header"><div><span class="eyebrow">项目智能资产</span><h1>Skill 管理</h1><p>Skill 安装在租户目录后仍需显式授权项目；Agent 固定版本，升级不会改变已有绑定。</p></div><button class="icon-button" title="刷新" @click="load"><RefreshCw :size="18" /></button></header>
    <ProjectSwitcher :projects="context.projects.value" :model-value="context.selectedID.value" :loading="loading" @update:model-value="changeProject" />
    <section class="two-column section-block">
      <form class="tool-panel form-stack" @submit.prevent="create"><div class="section-heading"><div><h2>创建 Skill</h2><span>首版创建后立即激活</span></div></div><label><span>名称</span><input v-model.trim="form.name" required /></label><label><span>说明</span><input v-model.trim="form.description" /></label><label><span>指令</span><textarea v-model.trim="form.instructions" required /></label><button class="button button--primary" :disabled="saving">创建</button></form>
      <section class="tool-panel"><div class="section-heading"><div><h2>调用记忆</h2><span>每个 Skill / Agent / 用户最多保留最近 100 条</span></div></div><div class="compact-list"><article v-for="memory in memories" :key="memory.id"><div><strong>{{ memory.input }}</strong><small>{{ memory.output }} · {{ memory.trace_id }}</small></div></article><small v-if="!memories.length">选择 Skill 的“查看记忆”后显示</small></div></section>
    </section>
    <section class="section-block"><div v-if="loading" class="loading-block"><span class="spinner" />正在加载 Skill</div><EmptyState v-else-if="!skills.length" :icon="Sparkles" title="暂无 Skill" description="创建首个版本化 Skill 资产。" /><div v-else class="list-grid"><article v-for="skill in skills" :key="skill.id" class="list-card"><span class="list-card__icon"><Sparkles :size="18" /></span><div class="list-card__main"><div><strong>{{ skill.name }}</strong><span class="status status--success">v{{ skill.version }}</span></div><small>{{ skill.description || skill.instructions }}</small><input v-model="versionText[skill.id]" placeholder="输入新版本指令" /></div><button class="button button--secondary" @click="newVersion(skill)">新版本</button><button v-if="!grantedIDs().has(skill.id)" class="button button--secondary" :disabled="!context.selectedID.value" @click="grant(skill)">授权项目</button><span v-else class="status status--success">已授权</span><button class="button button--secondary" @click="inspect(skill)">查看记忆</button><button class="button button--secondary" @click="optimize(skill)">优化 stub</button></article></div></section>
  </div>
</template>
