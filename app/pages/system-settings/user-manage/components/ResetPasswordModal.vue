<script setup lang="ts">
const props = defineProps<{
  formKey: number
  refresh: VoidFunction
}>()

const { $authClient } = useNuxtApp()
const { successToast, errorToast } = useAppToast()

const { i18nPermissions } = useMessage()
const { forgotPasswordFormSchema } = useSchema()
const { markUserMustChangePassword } = useSystemApi()
const loading = ref(false)
const mustChangePassword = ref(true)

const userId = defineModel<string | null>('userId', { required: true })

const open = computed({
  get: () => !!userId.value,
  set: (value) => {
    if (!value) {
      userId.value = null
      mustChangePassword.value = true
    }
  },
})

async function onSubmit(data: ForgotPasswordFormSchema) {
  if (!userId.value)
    return

  loading.value = true
  const { error } = await $authClient.admin
    .setUserPassword({
      newPassword: data.newPassword,
      userId: userId.value,
    })
  if (error) {
    errorToast(error.message)
    loading.value = false
    return
  }

  if (mustChangePassword.value) {
    const response = await markUserMustChangePassword(userId.value, true)
    if (!isSuccess(response.code)) {
      errorToast(response.msg)
      loading.value = false
      return
    }
  }

  loading.value = false
  successToast()
  userId.value = null
  mustChangePassword.value = true
  props.refresh()
}
</script>

<template>
  <AutoFormModal
    :key="formKey"
    v-model:open="open"
    :title="i18nPermissions('resetPassword')"
    :schema="forgotPasswordFormSchema"
    @submit="onSubmit"
  >
    <div class="mt-4">
      <UCheckbox
        v-model="mustChangePassword"
        label="强制下次登录修改密码"
      />
    </div>
    <template #footer="{ disabled, submit, close }">
      <AutoFormModalFooter :disabled="disabled" :loading="loading" @submit="submit" @close="close" />
    </template>
  </AutoFormModal>
</template>
