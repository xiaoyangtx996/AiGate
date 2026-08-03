<script setup lang="ts">
import { Bot, Send } from 'lucide-vue-next'
import { onUnmounted, ref } from 'vue'
import { api } from '../lib/api'
import { toast } from '../lib/toast'

const question = ref('今天全部项目的 LLM 与 MCP 用量和成本是多少？')
const answer = ref('')
const loading = ref(false)
async function ask() {
  if (!question.value.trim()) return
  loading.value = true
  try { answer.value = (await api.botChat(question.value)).answer }
  catch (error) { toast(error instanceof Error ? error.message : '管理助手查询失败', 'error') }
  finally { loading.value = false }
}
onUnmounted(() => { question.value = ''; answer.value = '' })
</script>

<template>
  <div class="page">
    <header class="page-header"><div><span class="eyebrow">只读用量问答</span><h1>AiGate 管理助手</h1><p>按当前管理员租户权限查询 LLM 与 MCP 用量；识别「今天 / 昨天 / 本月」（UTC），未写时间则累计全量。不执行配置变更。</p></div></header>
    <section class="tool-panel section-block">
      <form class="form-stack" @submit.prevent="ask"><label><span>用量问题</span><textarea v-model.trim="question" rows="4" placeholder="例如：今天全部项目的 LLM 与 MCP 用量和成本是多少？" /></label><button class="button button--primary" :disabled="loading || !question"><Send :size="16" />提问</button></form>
      <div v-if="answer" class="bot-answer"><Bot :size="20" /><p>{{ answer }}</p></div>
    </section>
  </div>
</template>
