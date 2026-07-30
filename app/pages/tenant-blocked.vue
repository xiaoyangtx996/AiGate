<script setup lang="ts">
const route = useRoute()
const code = computed(() => String(route.query.code || 'TENANT_EXPIRED'))
const isSuspended = computed(() => code.value === 'TENANT_SUSPENDED')
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="w-full max-w-lg rounded-lg border p-6 text-center">
      <UIcon :name="isSuspended ? 'lucide:ban' : 'lucide:calendar-x'" class="mx-auto mb-4 text-4xl text-error" />
      <h1 class="text-xl font-bold">
        {{ isSuspended ? 'Tenant suspended' : 'Tenant expired' }}
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ isSuspended
          ? 'This tenant has been suspended. Contact an administrator to restore access.'
          : 'This tenant has expired. Contact an administrator to renew the tenant package.' }}
      </p>
      <div class="mt-6 flex justify-center gap-2">
        <UButton to="/auth/sign-in" variant="outline" icon="lucide:log-in">
          Back to sign in
        </UButton>
      </div>
    </div>
  </div>
</template>
