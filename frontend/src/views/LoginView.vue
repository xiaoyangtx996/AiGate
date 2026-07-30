<script setup lang="ts">
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiBaseURL, login, TenantSelectionError, type TenantOption } from '../lib/api'
import { setSession } from '../lib/session'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const form = reactive({ email: '', password: '', tenant_id: '' })
const tenants = ref<TenantOption[]>([])

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const result = await login({ email: form.email, password: form.password, ...(form.tenant_id ? { tenant_id: form.tenant_id } : {}) })
    setSession(result.token)
    await router.replace('/organization')
  } catch (cause) {
    if (cause instanceof TenantSelectionError) {
      tenants.value = cause.tenants
      form.tenant_id = cause.tenants[0]?.id || ''
      error.value = '此账号属于多个租户，请选择后继续。'
    } else {
      error.value = cause instanceof Error ? cause.message : '登录失败'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-brand"><span class="brand__mark"><ShieldCheck :size="21" /></span><strong>AiGate</strong></div>
      <div class="login-heading"><span class="eyebrow">企业 AI 管控台</span><h1>登录控制台</h1><p>系统会自动识别你的租户与权限。</p></div>
      <form class="form-stack" @submit.prevent="submit">
        <label><span>邮箱</span><input v-model.trim="form.email" required type="email" autocomplete="username" placeholder="admin@example.com" /></label>
        <label><span>密码</span><div class="input-with-icon"><LockKeyhole :size="17" /><input v-model="form.password" required type="password" autocomplete="current-password" placeholder="输入密码" /></div></label>
        <label v-if="tenants.length"><span>选择租户</span><select v-model="form.tenant_id" required><option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">{{ tenant.name }}</option></select></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="button button--primary button--full" :disabled="loading"><span>{{ loading ? '正在登录' : '登录' }}</span><ArrowRight :size="17" /></button>
      </form>
      <footer><span>API</span><code>{{ apiBaseURL }}</code></footer>
    </section>
    <aside class="login-context">
      <div><span class="context-index">DEMO 0</span><h2>密钥、配额与调用<br />在一个视图内闭环。</h2></div>
      <dl><div><dt>身份</dt><dd>租户管理员</dd></div><div><dt>网关</dt><dd>OpenAI 兼容</dd></div><div><dt>审计</dt><dd>Trace 关联</dd></div></dl>
    </aside>
  </main>
</template>
