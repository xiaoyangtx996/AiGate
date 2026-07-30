<script setup lang="ts">
import { useMenuStore } from '@/stores/useMenuStore'

interface OrgItem {
  id: string
  name: string
}

const GLOBAL_VALUE = '__global__'

const { getActiveOrganizations, switchActiveOrganization } = useAigateApi()
const menuStore = useMenuStore()
const switching = ref(false)

const { data, refresh } = await useAsyncData('aigate-active-organizations', async () => {
  const res = await getActiveOrganizations()
  return (
    res.data ?? {
      activeOrganizationId: null,
      globalAvailable: false,
      items: [],
    }
  ) as { activeOrganizationId: string | null, globalAvailable: boolean, items: OrgItem[] }
})

const selected = ref(data.value?.activeOrganizationId ?? GLOBAL_VALUE)

watch(
  () => data.value?.activeOrganizationId,
  (value) => {
    selected.value = value ?? GLOBAL_VALUE
  },
)

const options = computed(() => {
  const orgOptions = (data.value?.items ?? []).map(org => ({ label: org.name, value: org.id }))
  return data.value?.globalAvailable ? [{ label: '全局视角', value: GLOBAL_VALUE }, ...orgOptions] : orgOptions
})

const shouldRender = computed(() => Boolean(data.value?.globalAvailable) || options.value.length > 1)

async function handleChange(value: string) {
  const organizationId = value === GLOBAL_VALUE ? null : value
  switching.value = true
  try {
    await switchActiveOrganization(organizationId)
    await refresh()
    await menuStore.fetchMenuTree()
    await refreshNuxtData()
  }
  finally {
    switching.value = false
  }
}
</script>

<template>
  <USelect
    v-if="shouldRender"
    v-model="selected"
    :items="options"
    :loading="switching"
    size="sm"
    class="w-44"
    @update:model-value="handleChange"
  />
</template>
