<script setup lang="ts">
import { Bot, MessageSquare, RefreshCw, Send } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ProjectSwitcher from '../components/ProjectSwitcher.vue'
import { api, type Citation, type KnowledgeBase, type MCPAsset, type ProjectAgent, type SkillAsset } from '../lib/api'
import { useProjectContext } from '../lib/project-context'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const context = useProjectContext()
const bases = ref<KnowledgeBase[]>([])
const assets = ref<MCPAsset[]>([])
const skills = ref<SkillAsset[]>([])
const agents = ref<ProjectAgent[]>([])
const selectedAgentID = ref('')
const loading = ref(true)
const saving = ref(false)
const question = ref('')
const gatewayKey = ref('')
const answer = ref('')
const citations = ref<Citation[]>([])
const form = reactive({
  name: '项目助手',
  model: 'step-3.5-flash',
  system_prompt: '仅依据项目资料回答。',
  knowledge_base_ids: [] as string[],
  mcp_asset_ids: [] as string[],
  skill_ids: [] as string[],
})
const agent = computed(() => agents.value.find((item) => item.id === selectedAgentID.value) || null)

async function loadProject() {
  if (!context.selectedID.value) {
    bases.value = []
    assets.value = []
    agents.value = []
    selectedAgentID.value = ''
    return
  }
  try {
    ;[bases.value, assets.value, skills.value, agents.value] = await Promise.all([
      api.knowledgeBases(context.selectedID.value),
      api.projectMCPAssets(context.selectedID.value),
      api.projectSkills(context.selectedID.value),
      api.agents(context.selectedID.value),
    ])
    selectedAgentID.value = agents.value.some((item) => item.id === selectedAgentID.value)
      ? selectedAgentID.value
      : (agents.value[0]?.id || '')
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Agent 数据加载失败', 'error')
  }
}

async function changeProject(value: string) {
  await context.select(value, router, route.query)
  await loadProject()
}

async function create() {
  saving.value = true
  try {
    const created = await api.createAgent(context.selectedID.value, form)
    agents.value.unshift(created)
    selectedAgentID.value = created.id
    toast('Agent 已创建', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '创建失败', 'error')
  } finally {
    saving.value = false
  }
}

async function chat() {
  if (!agent.value) return
  const key = gatewayKey.value
  try {
    const result = await api.agentChat(context.selectedID.value, agent.value.id, {
      question: question.value,
      gateway_api_key: key,
    })
    answer.value = result.answer
    citations.value = result.citations
    question.value = ''
    gatewayKey.value = ''
  } catch (error) {
    toast(error instanceof Error ? error.message : '对话失败', 'error')
  }
}

onMounted(async () => {
  try {
    await context.load(String(route.query.project || ''))
    await context.select(context.selectedID.value, router, route.query)
    await loadProject()
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  gatewayKey.value = ''
})
</script>

<template>
  <div class="page page--wide">
    <header class="page-header">
      <div>
        <span class="eyebrow">项目智能</span>
        <h1>Agent</h1>
        <p>Agent 绑定项目知识与已授权 MCP，对话统一经过 AiGate Gateway。</p>
      </div>
      <button class="icon-button" title="刷新" @click="loadProject"><RefreshCw :size="18" /></button>
    </header>
    <ProjectSwitcher
      :projects="context.projects.value"
      :model-value="context.selectedID.value"
      :loading="loading"
      @update:model-value="changeProject"
    />
    <EmptyState
      v-if="!loading && !context.projects.value.length"
      :icon="Bot"
      title="暂无可访问项目"
      description="请先创建项目并授予成员。"
    />
    <template v-else-if="context.selectedID.value">
      <section class="two-column section-block">
        <form class="tool-panel form-stack" @submit.prevent="create">
          <div class="section-heading">
            <div>
              <h2>创建 Agent</h2>
              <span>Skill 固定绑定当前激活版本，对话写入有界记忆和用量事件</span>
            </div>
          </div>
          <label><span>名称</span><input v-model.trim="form.name" required /></label>
          <label><span>模型</span><input v-model.trim="form.model" required /></label>
          <label><span>系统提示词</span><textarea v-model="form.system_prompt" /></label>
          <fieldset>
            <legend>知识库</legend>
            <label v-for="base in bases" :key="base.id" class="check-row">
              <input v-model="form.knowledge_base_ids" type="checkbox" :value="base.id" />
              <span>{{ base.name }}</span>
            </label>
            <small v-if="!bases.length">当前项目暂无知识库</small>
          </fieldset>
          <fieldset>
            <legend>已授权 Skill</legend>
            <label v-for="skill in skills" :key="skill.id" class="check-row">
              <input v-model="form.skill_ids" type="checkbox" :value="skill.id" />
              <span>{{ skill.name }} · v{{ skill.version }}</span>
            </label>
            <small v-if="!skills.length">当前项目暂无已授权 Skill</small>
          </fieldset>
          <fieldset>
            <legend>已授权 MCP</legend>
            <label v-for="asset in assets" :key="asset.id" class="check-row">
              <input v-model="form.mcp_asset_ids" type="checkbox" :value="asset.id" />
              <span>{{ asset.name }} · {{ asset.health_status }}</span>
            </label>
            <small v-if="!assets.length">当前项目暂无已授权 MCP</small>
          </fieldset>
          <button class="button button--primary" :disabled="saving">创建 Agent</button>
        </form>
        <section class="tool-panel">
          <div class="section-heading">
            <div>
              <h2>Agent 对话</h2>
              <span>Gateway Key 仅保存在当前内存，成功发送后清空</span>
            </div>
          </div>
          <label class="form-stack">
            <span>Agent</span>
            <select v-model="selectedAgentID">
              <option value="">请选择</option>
              <option v-for="item in agents" :key="item.id" :value="item.id">{{ item.name }} · {{ item.model }}</option>
            </select>
          </label>
          <form class="form-stack" @submit.prevent="chat">
            <label>
              <span>员工 Gateway API Key</span>
              <input v-model="gatewayKey" type="password" autocomplete="off" required />
            </label>
            <label><span>问题</span><textarea v-model.trim="question" required /></label>
            <button class="button button--primary" :disabled="!agent"><Send :size="15" />发送</button>
          </form>
        </section>
      </section>
      <section v-if="answer" class="answer-band">
        <header>
          <MessageSquare :size="17" />
          <strong>{{ agent?.name }} 的回答</strong>
        </header>
        <p>{{ answer }}</p>
        <div class="citation-list">
          <span v-for="citation in citations" :key="citation.document_id + citation.span_start">
            引用 {{ citation.document_id }} · {{ citation.span_start }}-{{ citation.span_end }}
          </span>
        </div>
      </section>
    </template>
  </div>
</template>
