<script setup lang="ts">
const appStore = useAppStore()
const colorMode = useColorMode()

interface ThemePreset {
  id: string
  name: string
  icon: string
  color: string
  mode: 'dark' | 'light'
  radius: number
}

const presets: ThemePreset[] = [
  {
    id: 'dark-tech',
    name: '暗黑科技',
    icon: 'lucide:moon',
    color: 'emerald',
    mode: 'dark',
    radius: 0.75,
  },
  {
    id: 'magazine',
    name: '杂志风',
    icon: 'lucide:sun',
    color: 'orange',
    mode: 'light',
    radius: 0,
  },
  {
    id: 'apple',
    name: 'Apple 拟物',
    icon: 'lucide:monitor',
    color: 'blue',
    mode: 'light',
    radius: 1.125,
  },
]

const activePreset = ref('dark-tech')

function applyPreset(preset: ThemePreset) {
  activePreset.value = preset.id
  colorMode.preference = preset.mode
  appStore.setPrimaryColor(preset.color)
  appStore.setRadius(preset.radius)
}
</script>

<template>
  <div class="flex items-center gap-1">
    <UTooltip v-for="preset in presets" :key="preset.id" :text="preset.name">
      <UButton
        :icon="preset.icon"
        :variant="activePreset === preset.id ? 'soft' : 'ghost'"
        :color="activePreset === preset.id ? 'primary' : 'neutral'"
        size="xs"
        square
        @click="applyPreset(preset)"
      />
    </UTooltip>
  </div>
</template>
