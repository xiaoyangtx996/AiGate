<script setup lang="ts">
interface BotToolStep {
  name: string
  input?: unknown
  result?: unknown
  status?: 'called' | 'failed'
  message?: string
  latency?: number
}

interface BotMessage {
  role: 'user' | 'assistant'
  content: string
  time?: string
  toolSteps?: BotToolStep[]
}

interface BotConversation {
  id: string
  title: string
  lastMessage: string
  updatedAt: string
  messages: BotMessage[]
}

const open = defineModel<boolean>('open', { required: true })
const { getBotConversations } = useAigateApi()
const { user } = useCurrentUser()
const loading = ref(false)
const loadingHistory = ref(false)
const input = ref('')
const fullscreen = ref(false)
const conversationId = ref<string>()
const conversations = ref<BotConversation[]>([])
const messages = ref<BotMessage[]>([])
const messagesEnd = ref<HTMLElement | null>(null)
const LazyMdc = defineAsyncComponent(() => import('@nuxtjs/mdc/runtime/components/MDC.vue'))

const isAdmin = computed(() => {
  const current = user.value as { role?: string, isAdmin?: boolean } | undefined
  return current?.isAdmin === true || current?.role === 'admin'
})

const quickPrompts = computed(() =>
  isAdmin.value
    ? [
        'Token usage top 5 this month',
        'Expiring and abnormal API keys',
        'Channel health status',
        'Quota usage rate',
      ]
    : [
        'My token usage this month',
        'My API key status',
        'Quota usage rate',
      ],
)

watch(
  messages,
  () => {
    nextTick(() => messagesEnd.value?.scrollIntoView({ behavior: 'smooth' }))
  },
  { deep: true },
)

watch(
  open,
  (value) => {
    if (value) {
      void import('@nuxtjs/mdc/runtime/components/MDC.vue')
      void loadConversations()
    }
  },
)

async function loadConversations() {
  loadingHistory.value = true
  try {
    const res = await getBotConversations()
    conversations.value = res.data || []
    if (!conversationId.value && messages.value.length === 0 && conversations.value[0])
      selectConversation(conversations.value[0])
  }
  finally {
    loadingHistory.value = false
  }
}

function selectConversation(conversation: BotConversation) {
  conversationId.value = conversation.id
  messages.value = conversation.messages || []
}

function startNewConversation() {
  conversationId.value = undefined
  messages.value = []
  input.value = ''
}

async function send(message = input.value) {
  const text = message.trim()
  if (!text || loading.value)
    return

  messages.value.push({ role: 'user', content: text, time: new Date().toISOString() })
  input.value = ''
  loading.value = true
  const assistantMessage: BotMessage = {
    role: 'assistant',
    content: '',
    time: new Date().toISOString(),
    toolSteps: [],
  }
  messages.value.push(assistantMessage)

  try {
    const response = await fetch('/api/aigate/bot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, conversationId: conversationId.value, stream: true }),
    })
    if (!response.ok || !response.body)
      throw new Error(`Bot request failed: ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() || ''
      for (const chunk of chunks) {
        const line = chunk.split('\n').find(item => item.startsWith('data: '))
        if (!line)
          continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]')
          continue

        const data = JSON.parse(payload) as {
          type?: 'start' | 'delta' | 'done' | 'error'
          content?: string
          message?: string
          conversationId?: string
          toolSteps?: BotToolStep[]
        }
        if (data.type === 'error')
          throw new Error(data.message || 'Bot stream failed')
        if (data.conversationId)
          conversationId.value = data.conversationId
        if (data.type === 'start' && data.toolSteps)
          assistantMessage.toolSteps = data.toolSteps
        if (data.type === 'delta')
          assistantMessage.content += data.content || ''
        if (data.type === 'done') {
          assistantMessage.content = data.message || assistantMessage.content
          assistantMessage.toolSteps = data.toolSteps || assistantMessage.toolSteps
        }
      }
    }
    await loadConversations()
  }
  catch (err) {
    assistantMessage.content = err instanceof Error ? err.message : 'Bot request failed'
  }
  finally {
    loading.value = false
  }
}

function toolResult(step: BotToolStep) {
  return JSON.stringify({ input: step.input, result: step.result }, null, 2)
}

function isRestrictedResult(result: unknown) {
  if (!result || typeof result !== 'object')
    return false
  const value = result as { restricted?: boolean, visibleCount?: number, globalCount?: number }
  if (!value.restricted)
    return false
  if (typeof value.visibleCount === 'number' && typeof value.globalCount === 'number')
    return value.visibleCount === 0 && value.globalCount > 0
  return false
}

function toolLabel(step: BotToolStep) {
  const parts = [step.name]
  if (step.status)
    parts.push(step.status)
  if (typeof step.latency === 'number')
    parts.push(`${step.latency}ms`)
  return parts.join(' / ')
}
</script>

<template>
  <USlideover v-model:open="open" :ui="{ content: fullscreen ? 'w-screen max-w-none' : 'max-w-[480px]' }">
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate font-bold">
            AiGate Bot
          </h3>
          <p class="truncate text-xs text-muted">
            Read-only operations assistant
          </p>
        </div>
        <div class="flex shrink-0 gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:plus" @click="startNewConversation" />
          <UButton
            size="xs"
            variant="ghost"
            :icon="fullscreen ? 'lucide:minimize-2' : 'lucide:maximize-2'"
            @click="fullscreen = !fullscreen"
          />
          <UButton size="xs" variant="ghost" icon="lucide:trash-2" @click="startNewConversation" />
        </div>
      </div>
    </template>

    <template #body>
      <div class="flex h-[calc(100vh-9rem)] flex-col gap-3">
        <div v-if="conversations.length" class="flex gap-2 overflow-x-auto pb-1">
          <UButton
            v-for="conversation in conversations"
            :key="conversation.id"
            size="xs"
            :variant="conversation.id === conversationId ? 'solid' : 'soft'"
            class="max-w-48 shrink-0"
            :loading="loadingHistory && conversation.id === conversationId"
            @click="selectConversation(conversation)"
          >
            <span class="truncate">{{ conversation.title || conversation.lastMessage || 'AiGate Bot' }}</span>
          </UButton>
        </div>

        <div v-if="messages.length === 0" class="rounded-md border border-default p-3">
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="prompt in quickPrompts"
              :key="prompt"
              size="xs"
              variant="soft"
              @click="send(prompt)"
            >
              {{ prompt }}
            </UButton>
          </div>
        </div>

        <div class="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          <div
            v-for="(message, index) in messages"
            :key="`${message.role}-${index}`"
            class="rounded-md border border-default p-3"
            :class="message.role === 'user' ? 'bg-muted/40' : 'bg-default'"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-muted">
                {{ message.role === 'user' ? 'You' : 'AiGate Bot' }}
              </span>
            </div>
            <ClientOnly v-if="message.role === 'assistant'">
              <Suspense>
                <div class="text-sm">
                  <LazyMdc :value="message.content || '...'" />
                </div>
                <template #fallback>
                  <p class="whitespace-pre-wrap text-sm">
                    {{ message.content }}
                  </p>
                </template>
              </Suspense>
            </ClientOnly>
            <p v-else class="whitespace-pre-wrap text-sm">
              {{ message.content }}
            </p>
            <UAccordion
              v-if="message.toolSteps?.length"
              class="mt-3"
              :items="message.toolSteps.map(step => ({
                label: toolLabel(step),
                icon: step.status === 'failed'
                  ? 'lucide:triangle-alert'
                  : isRestrictedResult(step.result) ? 'lucide:shield-alert' : 'lucide:wrench',
                content: toolResult(step),
              }))"
            />
          </div>
          <div ref="messagesEnd" />
        </div>

        <div class="flex gap-2">
          <UInput
            v-model="input"
            class="flex-1"
            placeholder="Ask AiGate Bot"
            :disabled="loading"
            @keyup.enter="send()"
          />
          <UButton icon="lucide:send" :loading="loading" @click="send()" />
        </div>
      </div>
    </template>
  </USlideover>
</template>
