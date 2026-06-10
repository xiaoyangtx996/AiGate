<script setup lang="ts">
const ready = useState('app-ready', () => false)

function markReady() {
  ready.value = true
}

onMounted(markReady)

if (import.meta.client) {
  setTimeout(markReady, 2500)
}
</script>

<template>
  <div
    v-if="!ready"
    class="fixed inset-0 flex w-screen h-screen justify-center items-center flex-col z-999 overflow-hidden bg-default"
  >
    <LoadingContent />
  </div>
</template>
