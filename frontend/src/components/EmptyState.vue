<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ icon: Component; title: string; description: string }>()
</script>

<template>
  <div class="empty-state">
    <component :is="icon" :size="24" />
    <strong>{{ title }}</strong>
    <span>{{ description }}</span>
  </div>
</template>
