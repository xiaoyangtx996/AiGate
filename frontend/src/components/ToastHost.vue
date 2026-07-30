<script setup lang="ts">
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-vue-next'
import { dismiss, toasts } from '../lib/toast'
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <div v-for="item in toasts" :key="item.id" class="toast" :class="`toast--${item.kind}`">
      <CheckCircle2 v-if="item.kind === 'success'" :size="18" />
      <CircleAlert v-else-if="item.kind === 'error'" :size="18" />
      <Info v-else :size="18" />
      <span>{{ item.message }}</span>
      <button class="icon-button" title="关闭" @click="dismiss(item.id)"><X :size="16" /></button>
    </div>
  </div>
</template>
