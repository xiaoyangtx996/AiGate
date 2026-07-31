<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '../lib/api'

const props = defineProps<{
  projects: Project[]
  modelValue: string
  loading?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const normalizedValue = computed(() => {
  if (props.allowEmpty && !props.modelValue) return ''
  if (props.projects.some((item) => item.id === props.modelValue)) return props.modelValue
  return props.allowEmpty ? '' : (props.projects[0]?.id || '')
})

const value = computed({
  get: () => normalizedValue.value,
  set: (next) => emit('update:modelValue', next),
})
</script>

<template>
  <label class="project-switcher">
    <span>当前项目</span>
    <select v-model="value" :disabled="loading || (!projects.length && !allowEmpty)">
      <option v-if="allowEmpty" value="">{{ emptyLabel || '全部项目' }}</option>
      <option v-else-if="!projects.length" value="">暂无可访问项目</option>
      <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
    </select>
  </label>
</template>
