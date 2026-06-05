<script setup lang="ts">
const specUrl = '/api/openapi'

useHead({
  title: 'API 文档',
  link: [
    {
      rel: 'stylesheet',
      href: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
    },
  ],
})

onMounted(async () => {
  await loadScript('https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js')
  const SwaggerUIBundle = (window as Window & { SwaggerUIBundle?: (config: Record<string, unknown>) => void }).SwaggerUIBundle
  if (!SwaggerUIBundle)
    return

  SwaggerUIBundle({
    url: specUrl,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      (window as Window & { SwaggerUIBundle?: { presets: { apis: unknown } } }).SwaggerUIBundle?.presets.apis,
    ],
  })
})

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}
</script>

<template>
  <div class="space-y-4">
    <UPageHeader
      title="API 文档"
      description="基于 OpenAPI 3.0 的 AiGate REST API 规范。原始 JSON："
    >
      <template #links>
        <UButton
          :to="specUrl"
          target="_blank"
          variant="subtle"
          color="neutral"
          icon="i-lucide-file-json"
          label="GET /api/openapi"
        />
      </template>
    </UPageHeader>

    <ClientOnly>
      <div
        id="swagger-ui"
        class="min-h-[70vh] rounded-lg border border-default bg-default"
      />
      <template #fallback>
        <USkeleton class="h-[70vh] w-full" />
      </template>
    </ClientOnly>
  </div>
</template>
