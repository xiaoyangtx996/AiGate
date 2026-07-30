<script setup lang="ts">
import { alertRuleTemplates } from '~~/shared/alert-rule-templates'

interface AlertRuleSettingRow {
  id: string
  enabled: boolean
  threshold: number
  notifyChannels: string[]
}

const { getSettings, saveSettings } = useSystemApi()
const { successToast } = useAppToast()
const confirm = useConfirmDialog()

const activeTab = ref('base')
const saving = ref(false)
const originalValues = ref<Record<string, any>>({})
const form = reactive<Record<string, any>>({
  'base.platformName': 'AiGate',
  'base.logoUrl': '',
  'base.defaultLanguage': 'zh-CN',
  'apiKey.defaultExpireDays': 365,
  'apiKey.activeLimitPerUser': 3,
  'apiKey.defaultDailyLimit': null,
  'notify.emailRecipients': '',
  'notify.resendFrom': '',
  'notify.webhookUrl': '',
  'rag.chunkSize': 1000,
  'rag.chunkOverlap': 200,
  'rag.topK': 5,
  'rag.dedupStrategy': 'reject',
  'retention.apiLogDays': 180,
  'retention.operationLogDays': 365,
  'advanced.gatewayDebug': false,
  'advanced.sessionHours': 24,
  'alert-rule-templates': [],
})

const tabs = [
  { label: 'Basic', value: 'base', icon: 'lucide:settings' },
  { label: 'API Keys', value: 'apiKey', icon: 'lucide:key' },
  { label: 'Notifications', value: 'notify', icon: 'lucide:bell' },
  { label: 'RAG', value: 'rag', icon: 'lucide:database' },
  { label: 'Retention', value: 'retention', icon: 'lucide:archive' },
  { label: 'Advanced', value: 'advanced', icon: 'lucide:shield-alert' },
  { label: 'Alert rules', value: 'alerts', icon: 'lucide:bell-ring' },
]

const alertRuleRows = computed<AlertRuleSettingRow[]>(() => {
  const stored = form['alert-rule-templates']
  const list = Array.isArray(stored) ? stored as AlertRuleSettingRow[] : []
  const byId = new Map(list.map(item => [item.id, item]))
  return alertRuleTemplates.map(template => {
    const override = byId.get(template.id)
    return {
      id: template.id,
      enabled: override?.enabled ?? true,
      threshold: override?.threshold ?? template.threshold,
      notifyChannels: override?.notifyChannels ?? [...template.notifyChannels],
    }
  })
})

function updateAlertRuleRow(id: string, patch: Partial<AlertRuleSettingRow>) {
  const next = alertRuleRows.value.map(row => row.id === id ? { ...row, ...patch } : row)
  form['alert-rule-templates'] = next
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function hasSensitiveChanges() {
  if (originalValues.value['advanced.gatewayDebug'] !== true && form['advanced.gatewayDebug'] === true)
    return true
  for (const key of ['retention.apiLogDays', 'retention.operationLogDays']) {
    const oldValue = toNumber(originalValues.value[key])
    const newValue = toNumber(form[key])
    if (oldValue !== null && newValue !== null && newValue < oldValue)
      return true
  }
  return false
}

const { pending: loading, refresh, data: settingsPayload } = await useAsyncData('system-settings-center', async () => {
  const res = await getSettings()
  Object.assign(form, res.data?.values || {})
  originalValues.value = { ...form }
  return res.data
})

const settingsMeta = computed(() => settingsPayload.value?.meta as { updatedAt?: string, updatedBy?: string | null } | null | undefined)

const fieldTips = {
  platformName: 'Displayed in the browser title and login page.',
  logoUrl: 'Public URL for the platform logo.',
  defaultLanguage: 'Default locale for new users.',
  defaultExpireDays: 'Default API key validity in days.',
  activeLimitPerUser: 'Maximum active keys per user.',
  defaultDailyLimit: 'Default daily token/request cap; empty means unlimited.',
  emailRecipients: 'Comma-separated alert email recipients.',
  resendFrom: 'Sender address for transactional email.',
  webhookUrl: 'Optional webhook for system notifications.',
  chunkSize: 'RAG document chunk size in characters.',
  chunkOverlap: 'Overlap between adjacent chunks.',
  topK: 'Number of chunks retrieved per query.',
  dedupStrategy: 'How duplicate documents are handled on upload.',
  apiLogDays: 'Days to retain API request logs.',
  operationLogDays: 'Days to retain admin operation logs.',
  gatewayDebug: 'Store full request/response bodies in API logs.',
  sessionHours: 'User session lifetime in hours.',
}

async function handleSave() {
  const sensitive = hasSensitiveChanges()
  const confirmSensitive = sensitive
    ? await confirm({
        title: 'Confirm sensitive change',
        description: 'This update changes audit retention or enables debug mode. Continue?',
        confirmLabel: 'Confirm',
        loadingLabel: 'Saving',
      })
    : false
  if (sensitive && !confirmSensitive)
    return
  saving.value = true
  try {
    await saveSettings({ values: { ...form }, confirmSensitive })
    successToast()
    await refresh()
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">
        System Settings
      </h2>
      <UButton icon="lucide:save" :loading="saving" @click="handleSave">
        {{ $t('common.save') }}
      </UButton>
    </div>

    <div class="grid gap-4 lg:grid-cols-[220px_1fr]">
      <UNavigationMenu v-model="activeTab" :items="tabs" orientation="vertical" />

      <UCard>
        <p v-if="settingsMeta?.updatedAt" class="mb-4 text-xs text-muted">
          Last modified: {{ settingsMeta.updatedBy || 'system' }} · {{ new Date(settingsMeta.updatedAt).toLocaleString() }}
        </p>
        <div v-if="loading" class="space-y-3">
          <USkeleton v-for="i in 6" :key="i" class="h-10" />
        </div>

        <div v-else-if="activeTab === 'base'" class="grid gap-4 md:grid-cols-2">
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Platform name
                <UTooltip :text="fieldTips.platformName"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model="form['base.platformName']" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Logo URL
                <UTooltip :text="fieldTips.logoUrl"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model="form['base.logoUrl']" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Default language
                <UTooltip :text="fieldTips.defaultLanguage"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <USelect
              v-model="form['base.defaultLanguage']"
              :items="[
                { label: '简体中文', value: 'zh-CN' },
                { label: 'English', value: 'en' },
              ]"
            />
          </UFormField>
        </div>

        <div v-else-if="activeTab === 'apiKey'" class="grid gap-4 md:grid-cols-2">
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Default expiry days
                <UTooltip :text="fieldTips.defaultExpireDays"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['apiKey.defaultExpireDays']" type="number" min="1" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Active key limit per user
                <UTooltip :text="fieldTips.activeLimitPerUser"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['apiKey.activeLimitPerUser']" type="number" min="1" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Default daily limit
                <UTooltip :text="fieldTips.defaultDailyLimit"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['apiKey.defaultDailyLimit']" type="number" min="0" placeholder="Unlimited" />
          </UFormField>
        </div>

        <div v-else-if="activeTab === 'notify'" class="grid gap-4 md:grid-cols-2">
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Alert email recipients
                <UTooltip :text="fieldTips.emailRecipients"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UTextarea v-model="form['notify.emailRecipients']" :rows="3" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Resend from
                <UTooltip :text="fieldTips.resendFrom"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model="form['notify.resendFrom']" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Webhook URL
                <UTooltip :text="fieldTips.webhookUrl"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model="form['notify.webhookUrl']" />
          </UFormField>
        </div>

        <div v-else-if="activeTab === 'rag'" class="grid gap-4 md:grid-cols-2">
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Chunk size
                <UTooltip :text="fieldTips.chunkSize"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['rag.chunkSize']" type="number" min="100" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Chunk overlap
                <UTooltip :text="fieldTips.chunkOverlap"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['rag.chunkOverlap']" type="number" min="0" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Top K
                <UTooltip :text="fieldTips.topK"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['rag.topK']" type="number" min="1" />
          </UFormField>
          <UFormField label="Dedup strategy">
            <USelect
              v-model="form['rag.dedupStrategy']"
              :items="[
                { label: 'Reject duplicates', value: 'reject' },
                { label: 'Overwrite', value: 'overwrite' },
                { label: 'Keep all', value: 'keep' },
              ]"
            />
          </UFormField>
        </div>

        <div v-else-if="activeTab === 'retention'" class="grid gap-4 md:grid-cols-2">
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                API log retention days
                <UTooltip :text="fieldTips.apiLogDays"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['retention.apiLogDays']" type="number" min="1" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Operation log retention days
                <UTooltip :text="fieldTips.operationLogDays"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['retention.operationLogDays']" type="number" min="1" />
          </UFormField>
        </div>

        <div v-else-if="activeTab === 'alerts'" class="space-y-3">
          <p class="text-sm text-muted">
            全局预警规则模板阈值与通知渠道（写入 alert-rule-templates 设置项）
          </p>
          <div
            v-for="row in alertRuleRows"
            :key="row.id"
            class="grid gap-3 rounded-md border border-default p-3 md:grid-cols-[1fr_120px_auto]"
          >
            <div>
              <p class="font-medium">
                {{ row.id }}
              </p>
              <p class="text-xs text-muted">
                {{ row.notifyChannels.join(', ') }}
              </p>
            </div>
            <UFormField label="Threshold">
              <UInput
                :model-value="row.threshold"
                type="number"
                min="0"
                @update:model-value="value => updateAlertRuleRow(row.id, { threshold: Number(value) })"
              />
            </UFormField>
            <div class="flex items-end justify-end">
              <USwitch
                :model-value="row.enabled"
                @update:model-value="value => updateAlertRuleRow(row.id, { enabled: value })"
              />
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'advanced'" class="grid gap-4 md:grid-cols-2">
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Gateway debug mode
                <UTooltip :text="fieldTips.gatewayDebug"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <USwitch v-model="form['advanced.gatewayDebug']" />
          </UFormField>
          <UFormField>
            <template #label>
              <span class="inline-flex items-center gap-1">
                Session hours
                <UTooltip :text="fieldTips.sessionHours"><UIcon name="lucide:info" class="size-3.5 text-muted" /></UTooltip>
              </span>
            </template>
            <UInput v-model.number="form['advanced.sessionHours']" type="number" min="1" />
          </UFormField>
        </div>
      </UCard>
    </div>
  </div>
</template>
