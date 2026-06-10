import type { DirectiveBinding } from 'vue'
import type { UiPermissionBinding } from '@/composables/useUiAuthorization'

function setVisible(el: HTMLElement, visible: boolean) {
  el.hidden = !visible
  el.setAttribute('aria-hidden', String(!visible))
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('permission', {
    mounted(el: HTMLElement, binding: DirectiveBinding<UiPermissionBinding>) {
      const { canUsePermission } = useUiAuthorization()
      setVisible(el, canUsePermission(binding.value))
    },
    updated(el: HTMLElement, binding: DirectiveBinding<UiPermissionBinding>) {
      const { canUsePermission } = useUiAuthorization()
      setVisible(el, canUsePermission(binding.value))
    },
  })
})
