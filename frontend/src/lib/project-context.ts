import { computed, ref } from 'vue'
import type { LocationQueryRaw, Router } from 'vue-router'
import { api, type Project } from './api'

const projects = ref<Project[]>([])
const selectedID = ref(localStorage.getItem('aigate_project_id') || '')

export function useProjectContext() {
  const current = computed(() => projects.value.find((item) => item.id === selectedID.value) || null)

  async function load(queryProject = '', allowEmpty = false, usageScope = false) {
    projects.value = await (usageScope ? api.usageProjectContexts() : api.projectContexts())
    const candidate = queryProject || (allowEmpty ? '' : selectedID.value)
    selectedID.value = projects.value.some((item) => item.id === candidate) ? candidate : (allowEmpty ? '' : (projects.value[0]?.id || ''))
    persist()
  }

  async function select(projectID: string, router?: Router, query: LocationQueryRaw = {}) {
    selectedID.value = projectID
    persist()
    if (router) await router.replace({ query: { ...query, project: projectID || undefined } })
  }

  function persist() {
    if (selectedID.value) localStorage.setItem('aigate_project_id', selectedID.value)
    else localStorage.removeItem('aigate_project_id')
  }

  return { projects, selectedID, current, load, select }
}
