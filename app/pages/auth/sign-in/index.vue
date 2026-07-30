<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { $authClient } = useNuxtApp()
const { signInFormSchema } = useSchema()
const { i18nAuth } = useMessage()
const { errorToast } = useAppToast()

const loading = ref(false)

/**
 * @description: 登录提交
 */
async function onSubmit(data: SignInFormSchema) {
  loading.value = true
  const { error } = await $authClient.signIn.username({ ...data, callbackURL: '/aigate/my-workbench' }).finally(() => {
    loading.value = false
  })
  if (error) {
    errorToast(i18nAuth('signIn.error'), error.message)
  }
}
</script>

<template>
  <UPageCard
    :title="i18nAuth('signIn.title')"
    :description="i18nAuth('signIn.description')"
    class="w-full sm:w-md"
    :ui="{
      title: 'text-xl',
      description: 'text-sm',
    }"
  >
    <AutoForm
      :schema="signInFormSchema"
      :config="{
        submit: {
          props: {
            label: i18nAuth('signIn.submit'),
            icon: 'ri:check-fill',
            loading,
            class: 'w-full justify-center',
          },
        },
      }"
      @submit="onSubmit"
    >
      <template #password-hint>
        <span class="text-xs text-muted">忘记密码请联系管理员重置</span>
      </template>
    </AutoForm>
  </UPageCard>
</template>
