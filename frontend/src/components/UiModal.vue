<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{ title: string; width?: 'normal' | 'wide' }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="$emit('close')">
    <section class="modal" :class="{ 'modal--wide': width === 'wide' }" role="dialog" aria-modal="true" :aria-label="title">
      <header class="modal__header">
        <h2>{{ title }}</h2>
        <button class="icon-button" title="关闭" @click="$emit('close')"><X :size="18" /></button>
      </header>
      <div class="modal__body"><slot /></div>
    </section>
  </div>
</template>
