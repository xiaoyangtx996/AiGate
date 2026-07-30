<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { forgotPasswordFormSchema } = useSchema()
const { forceChangePassword } = useAigateApi()
const { successToast, errorToast } = useAppToast()

const loading = ref(false)

async function onSubmit(data: ForgotPasswordFormSchema) {
  loading.value = true
  const response = await forceChangePassword({ newPassword: data.newPassword }).finally(() => {
    loading.value = false
  })

  if (!isSuccess(response.code)) {
    errorToast(response.msg)
    return
  }

  successToast()
  await navigateTo('/aigate/my-workbench')
}
</script>

<template>
  <UPageCard
    title="修改密码"
    description="管理员已重置你的密码，请设置新密码后继续使用。"
    class="w-full sm:w-md"
    :ui="{
      title: 'text-xl',
      description: 'text-sm',
    }"
  >
    <AutoForm
      :schema="forgotPasswordFormSchema"
      :config="{
        submit: {
          props: {
            label: '确认修改',
            icon: 'ri:check-fill',
            loading,
            class: 'w-full justify-center',
          },
        },
      }"
      @submit="onSubmit"
    />
  </UPageCard>
</template>
