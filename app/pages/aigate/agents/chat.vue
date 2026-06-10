<script setup lang="ts">
interface ChatMessage {
  role: string
  content: string
  time: string
}
interface ChatConversation {
  id: string
  agentId: string
  title: string
  lastMessage: string
  updatedAt: string
  messages: ChatMessage[]
}
interface AgentItem {
  id: string
  name: string
  description?: string
  model?: string
}

const route = useRoute()
const { t } = useI18n()
const { getAgentList, getAgentConversations } = useAigateApi()
const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.agents.chatPage.${key}`, params ?? {})

const { data } = await useAsyncData('aigate-agents-chat', async () => {
  const res = await getAgentList()
  return res.data?.items ?? []
})
const agents = computed(() => data.value || [])
const selectedAgent = ref<AgentItem | null>(null)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const conversationId = ref<string | undefined>()
const conversations = ref<ChatConversation[]>([])
const messagesEnd = ref<HTMLElement | null>(null)

const LazyMdc = defineAsyncComponent(() => import('@nuxtjs/mdc/runtime/components/MDC.vue'))

onMounted(async () => {
  void import('@nuxtjs/mdc/runtime/components/MDC.vue')
  const saved = localStorage.getItem('aigate-chat-history')
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as { conversations?: ChatConversation[] }
      conversations.value = parsed.conversations || []
    } catch {
      /* ignore */
    }
  }

  const agentId = route.query.agentId as string | undefined
  if (agentId) {
    const target = agents.value.find(a => a.id === agentId)
    if (target) await selectAgent(target)
  }
})

watch(
  messages,
  () => {
    nextTick(() => {
      messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
    })
  },
  { deep: true },
)

async function selectAgent(agent: AgentItem) {
  selectedAgent.value = agent
  messages.value = []
  conversationId.value = undefined
  try {
    const res = await getAgentConversations(agent.id)
    conversations.value = res.data || []
  } catch {
    conversations.value = []
  }
}

async function startNewConversation() {
  conversationId.value = undefined
  messages.value = []
}

async function sendMessage() {
  if (!inputText.value.trim() || sending.value || !selectedAgent.value) return
  const userMsg = { role: 'user', content: inputText.value.trim(), time: new Date().toISOString() }
  messages.value.push(userMsg)
  const msg = inputText.value.trim()
  inputText.value = ''
  sending.value = true

  messages.value.push({ role: 'assistant', content: '', time: new Date().toISOString() })

  const lastMessage = messages.value.at(-1)
  const agent = selectedAgent.value

  try {
    const response = await fetch(`/api/aigate/agent/${agent.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, conversationId: conversationId.value, stream: true }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let reply = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue
          try {
            const parsed = JSON.parse(payload)
            if (parsed.type === 'start' && parsed.conversationId) {
              conversationId.value = parsed.conversationId
            }
            if (parsed.type === 'delta' && parsed.content) {
              reply += parsed.content
              if (lastMessage) lastMessage.content = reply
            }
            if (parsed.type === 'done') {
              conversationId.value = parsed.conversationId || conversationId.value
              reply = parsed.message || reply
              if (lastMessage) lastMessage.content = reply
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.message || 'Stream error')
            }
          } catch (e: unknown) {
            const err = e as { message?: string }
            if (err?.message && !err.message.includes('JSON')) throw e
          }
        }
      }

      saveToLocalStorage(conversationId.value, agent.id, msg, reply)
    } else {
      const res = await response.json()
      conversationId.value = res.data?.conversationId
      const reply = res.data?.message || p('noReply')
      if (lastMessage) lastMessage.content = reply
      saveToLocalStorage(conversationId.value, agent.id, msg, reply)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : p('checkGateway')
    const errorMsg = p('requestFailed', { message })
    if (lastMessage) lastMessage.content = errorMsg
  } finally {
    sending.value = false
  }
}

function saveToLocalStorage(convId: string | undefined, agentId: string, userMsg: string, assistantMsg: string) {
  try {
    const saved = localStorage.getItem('aigate-chat-history')
    const history = saved
      ? (JSON.parse(saved) as { conversations: ChatConversation[]; currentConv: string | null })
      : { conversations: [], currentConv: null }

    const id = convId || `local-${Date.now()}`
    if (!conversationId.value) {
      conversationId.value = id
    }

    const idx = history.conversations.findIndex(c => c.id === id)
    const title = userMsg.slice(0, 50) + (userMsg.length > 50 ? '...' : '')
    const storedMessages = [...messages.value]

    if (idx >= 0) {
      const conversation = history.conversations[idx]
      if (conversation) {
        conversation.lastMessage = assistantMsg.slice(0, 100)
        conversation.updatedAt = new Date().toISOString()
        conversation.messages = storedMessages
      }
    } else {
      history.conversations.unshift({
        id,
        agentId,
        title,
        lastMessage: assistantMsg.slice(0, 100),
        updatedAt: new Date().toISOString(),
        messages: storedMessages,
      })
    }

    if (history.conversations.length > 50) {
      history.conversations = history.conversations.slice(0, 50)
    }

    history.currentConv = id
    conversations.value = history.conversations
    localStorage.setItem('aigate-chat-history', JSON.stringify(history))
  } catch {
    /* ignore */
  }
}

async function loadConversation(convId: string) {
  conversationId.value = convId
  const conversation = conversations.value.find(item => item.id === convId)
  messages.value = conversation?.messages || []
}

function deleteConversation(convId: string, e: Event) {
  e.stopPropagation()
  try {
    const saved = localStorage.getItem('aigate-chat-history')
    if (saved) {
      const history = JSON.parse(saved) as { conversations: ChatConversation[]; currentConv: string | null }
      history.conversations = history.conversations.filter(c => c.id !== convId)
      if (history.currentConv === convId) {
        history.currentConv = null
        messages.value = []
        conversationId.value = undefined
      }
      localStorage.setItem('aigate-chat-history', JSON.stringify(history))
      conversations.value = history.conversations
    }
  } catch {
    /* ignore */
  }
}

function exportConversation() {
  if (messages.value.length === 0) return

  let md = `# ${p('exportTitle')}\n\n`
  md += `**${p('exportTime')}**: ${new Date().toLocaleString()}\n`
  md += `**Agent**: ${selectedAgent.value?.name || 'Unknown'}\n`
  md += `**${p('exportModel')}**: ${selectedAgent.value?.model || 'gpt-4o'}\n\n`
  md += '---\n\n'

  for (const msg of messages.value) {
    const role = msg.role === 'user' ? p('exportUser') : 'Assistant'
    md += `### ${role}\n\n${msg.content}\n\n---\n\n`
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conversation-${conversationId.value || Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="flex h-[calc(100vh-120px)] gap-4">
    <div class="w-72 shrink-0 space-y-2">
      <h3 class="text-lg font-bold mb-3">
        {{ p('selectAgent') }}
      </h3>
      <UCard
        v-for="agent in agents"
        :key="agent.id"
        :class="selectedAgent?.id === agent.id ? 'border-primary' : 'cursor-pointer hover:border-primary/50'"
        @click="selectAgent(agent)"
      >
        <div class="flex items-center gap-2">
          <UIcon name="lucide:bot" class="text-primary" />
          <div>
            <p class="font-medium text-sm">
              {{ agent.name }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ agent.description }}
            </p>
          </div>
        </div>
      </UCard>

      <template v-if="conversations.length > 0">
        <div class="flex items-center justify-between mt-4">
          <h4 class="text-sm font-bold text-muted">
            {{ p('history') }}
          </h4>
          <UButton size="xs" variant="ghost" icon="lucide:x" @click="conversations = []" />
        </div>
        <div class="space-y-1">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="group flex items-center gap-2 text-sm p-2 rounded hover:bg-muted cursor-pointer"
            :class="conversationId === conv.id ? 'bg-muted' : ''"
            @click="loadConversation(conv.id)"
          >
            <UIcon name="lucide:message-square" class="shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="truncate">
                {{ conv.title || p('untitled') }}
              </p>
              <p class="text-xs text-muted truncate">
                {{ conv.lastMessage }}
              </p>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              icon="lucide:trash-2"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click="deleteConversation(conv.id, $event)"
            />
          </div>
        </div>
      </template>
    </div>

    <div class="flex-1 flex flex-col">
      <template v-if="selectedAgent">
        <div class="border-b pb-3 mb-3 flex items-center justify-between">
          <div>
            <h3 class="font-bold flex items-center gap-2">
              <UIcon name="lucide:bot" class="text-primary" />
              {{ selectedAgent.name }}
              <UBadge variant="outline" size="xs">
                {{ selectedAgent.model || 'gpt-4o' }}
              </UBadge>
            </h3>
            <p class="text-sm text-muted">
              {{ selectedAgent.description }}
            </p>
          </div>
          <div class="flex gap-2">
            <UButton
              size="xs"
              variant="outline"
              icon="lucide:download"
              :disabled="messages.length === 0"
              @click="exportConversation"
            >
              {{ p('export') }}
            </UButton>
            <UButton size="xs" variant="outline" icon="lucide:plus" @click="startNewConversation">
              {{ p('newChat') }}
            </UButton>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
          >
            <div
              :class="msg.role === 'user' ? 'bg-primary text-white' : 'bg-muted'"
              class="max-w-[70%] rounded-lg px-4 py-2"
            >
              <ClientOnly v-if="msg.role === 'assistant'">
                <Suspense>
                  <LazyMdc :value="msg.content" />
                  <template #fallback>
                    <p class="text-sm whitespace-pre-wrap">
                      {{ msg.content }}
                    </p>
                  </template>
                </Suspense>
              </ClientOnly>
              <p v-else class="text-sm whitespace-pre-wrap">
                {{ msg.content }}
              </p>
              <p class="text-xs opacity-60 mt-1">
                {{ new Date(msg.time).toLocaleTimeString() }}
              </p>
            </div>
          </div>
          <div v-if="sending" class="flex justify-start">
            <div class="bg-muted rounded-lg px-4 py-2">
              <UIcon name="lucide:loader-2" class="animate-spin" />
            </div>
          </div>
          <div ref="messagesEnd" />
        </div>

        <div class="flex gap-2">
          <UInput
            v-model="inputText"
            :placeholder="p('inputPlaceholder')"
            class="flex-1"
            :disabled="sending"
            @keyup.enter="sendMessage"
          />
          <UButton :disabled="!inputText.trim() || sending" :loading="sending" @click="sendMessage">
            <UIcon name="lucide:send" />
          </UButton>
        </div>
      </template>

      <template v-else>
        <div class="flex-1 flex items-center justify-center text-muted">
          <div class="text-center">
            <UIcon name="lucide:bot" class="text-4xl mb-2" />
            <p>{{ p('selectPrompt') }}</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
