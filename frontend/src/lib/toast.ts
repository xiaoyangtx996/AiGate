import { reactive } from 'vue'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastItem = { id: number; message: string; kind: ToastKind }

export const toasts = reactive<ToastItem[]>([])
let nextID = 1

export function toast(message: string, kind: ToastKind = 'info') {
  const item = { id: nextID++, message, kind }
  toasts.push(item)
  window.setTimeout(() => dismiss(item.id), 3200)
}

export function dismiss(id: number) {
  const index = toasts.findIndex((item) => item.id === id)
  if (index >= 0) toasts.splice(index, 1)
}
