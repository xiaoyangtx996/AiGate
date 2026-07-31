<script setup lang="ts">
import { BookOpen, RefreshCw, RotateCcw, Search, Upload } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ProjectSwitcher from '../components/ProjectSwitcher.vue'
import { api, type Citation, type KnowledgeBase, type KnowledgeDocument } from '../lib/api'
import { useProjectContext } from '../lib/project-context'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const context = useProjectContext()
const bases = ref<KnowledgeBase[]>([])
const selectedKB = ref('')
const documents = ref<KnowledgeDocument[]>([])
const hits = ref<Array<{ content: string; score: number; citation: Citation }>>([])
const name = ref('项目知识库')
const query = ref('')
const file = ref<File | null>(null)
const loading = ref(true)
const saving = ref(false)
let pollTimer: number | undefined

async function loadProject() {
  stopPolling()
  bases.value = []
  documents.value = []
  hits.value = []
  if (!context.selectedID.value) return
  try {
    bases.value = await api.knowledgeBases(context.selectedID.value)
    selectedKB.value = bases.value.some((item) => item.id === selectedKB.value)
      ? selectedKB.value
      : (bases.value[0]?.id || '')
    await loadDocuments()
  } catch (error) {
    toast(error instanceof Error ? error.message : '知识库加载失败', 'error')
  }
}

async function loadDocuments() {
  stopPolling()
  documents.value = selectedKB.value
    ? await api.knowledgeDocuments(context.selectedID.value, selectedKB.value)
    : []
  if (documents.value.some((item) => ['queued', 'processing'].includes(item.status))) {
    pollTimer = window.setTimeout(poll, 1500)
  }
}

async function poll() {
  try {
    documents.value = await Promise.all(
      documents.value.map((item) =>
        ['queued', 'processing'].includes(item.status)
          ? api.documentStatus(context.selectedID.value, item.id)
          : item,
      ),
    )
    if (documents.value.some((item) => ['queued', 'processing'].includes(item.status))) {
      pollTimer = window.setTimeout(poll, 1500)
    }
  } catch (error) {
    toast(error instanceof Error ? error.message : '文档状态刷新失败', 'error')
  }
}

function stopPolling() {
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = undefined
}

async function changeProject(value: string) {
  await context.select(value, router, route.query)
  await loadProject()
}

async function createKB() {
  saving.value = true
  try {
    const item = await api.createKnowledgeBase(context.selectedID.value, name.value)
    bases.value.push(item)
    selectedKB.value = item.id
    documents.value = []
    toast('知识库已创建', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '创建失败', 'error')
  } finally {
    saving.value = false
  }
}

async function upload() {
  if (!file.value || !selectedKB.value) return
  saving.value = true
  try {
    documents.value.unshift(
      await api.uploadDocument(context.selectedID.value, selectedKB.value, file.value.name, file.value),
    )
    file.value = null
    stopPolling()
    pollTimer = window.setTimeout(poll, 500)
    toast('文档已进入处理队列', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '上传失败', 'error')
  } finally {
    saving.value = false
  }
}

async function retry(document: KnowledgeDocument) {
  try {
    await api.retryDocument(context.selectedID.value, document.id)
    document.status = 'queued'
    document.last_error = ''
    stopPolling()
    pollTimer = window.setTimeout(poll, 500)
    toast('已重新入队', 'success')
  } catch (error) {
    toast(error instanceof Error ? error.message : '重试失败', 'error')
  }
}

async function search() {
  if (!selectedKB.value) return
  try {
    hits.value = (await api.searchKnowledge(context.selectedID.value, selectedKB.value, query.value)).results
  } catch (error) {
    toast(error instanceof Error ? error.message : '检索失败', 'error')
  }
}

watch(selectedKB, loadDocuments)

onMounted(async () => {
  try {
    await context.load(String(route.query.project || ''))
    await context.select(context.selectedID.value, router, route.query)
    await loadProject()
  } finally {
    loading.value = false
  }
})

onUnmounted(stopPolling)
</script>

<template>
  <div class="page page--wide">
    <header class="page-header">
      <div>
        <span class="eyebrow">项目知识</span>
        <h1>知识库</h1>
        <p>上传文档，等待处理完成后执行带引用检索。</p>
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
      :icon="BookOpen"
      title="暂无可访问项目"
      description="请先在项目管理中创建项目并授予成员。"
    />
    <template v-else-if="context.selectedID.value">
      <section class="two-column section-block">
        <div class="tool-panel">
          <div class="section-heading">
            <div>
              <h2>知识库</h2>
              <span>选择现有知识库或创建新的知识空间</span>
            </div>
          </div>
          <label class="form-stack">
            <span>当前知识库</span>
            <select v-model="selectedKB">
              <option value="">请选择</option>
              <option v-for="base in bases" :key="base.id" :value="base.id">{{ base.name }}</option>
            </select>
          </label>
          <form class="inline-form" @submit.prevent="createKB">
            <input v-model.trim="name" required />
            <button class="button button--secondary" :disabled="saving">创建</button>
          </form>
        </div>
        <div class="tool-panel">
          <div class="section-heading">
            <div>
              <h2>上传文档</h2>
              <span>支持 Markdown、文本与 PDF</span>
            </div>
          </div>
          <input
            type="file"
            accept=".md,.markdown,.txt,.pdf"
            @change="file = ($event.target as HTMLInputElement).files?.[0] || null"
          />
          <button class="button button--primary" :disabled="!file || !selectedKB || saving" @click="upload">
            <Upload :size="15" />上传
          </button>
        </div>
      </section>
      <section class="section-block">
        <div class="section-heading">
          <div>
            <h2>文档处理状态</h2>
            <span>queued / processing 会自动轮询</span>
          </div>
        </div>
        <div v-if="documents.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>文档</th>
                <th>状态</th>
                <th>大小</th>
                <th>错误</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="document in documents" :key="document.id">
                <td>{{ document.filename }}</td>
                <td>
                  <span
                    class="status"
                    :class="document.status === 'ready' ? 'status--success' : document.status === 'failed' ? 'status--danger' : 'status--warning'"
                  >{{ document.status }}</span>
                </td>
                <td>{{ document.size_bytes.toLocaleString() }} B</td>
                <td>{{ document.last_error || '—' }}</td>
                <td>
                  <button v-if="document.status === 'failed'" class="button button--secondary" @click="retry(document)">
                    <RotateCcw :size="14" />重试
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else :icon="BookOpen" title="暂无文档" description="选择知识库并上传首份资料。" />
      </section>
      <section class="section-block">
        <div class="section-heading">
          <div>
            <h2>引用检索</h2>
            <span>结果展示文档与原文跨度</span>
          </div>
        </div>
        <form class="inline-form" @submit.prevent="search">
          <input v-model.trim="query" required placeholder="输入问题或关键词" />
          <button class="button button--primary" :disabled="!selectedKB"><Search :size="15" />检索</button>
        </form>
        <div class="result-list">
          <article
            v-for="hit in hits"
            :key="hit.citation.document_id + hit.citation.span_start"
            class="result-row"
          >
            <p>{{ hit.content }}</p>
            <small>
              引用 {{ hit.citation.document_id }} · {{ hit.citation.span_start }}-{{ hit.citation.span_end }} ·
              {{ hit.score.toFixed(3) }}
            </small>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
