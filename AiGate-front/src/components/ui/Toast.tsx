import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { useUIStore, Toast as ToastType } from '@/stores/ui'

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  const Icon = icons[toast.type]

  return (
    <div className={`toast toast-${toast.type} flex items-start gap-3 min-w-[300px] max-w-[500px]`}>
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.message && <p className="text-sm opacity-90 mt-1">{toast.message}</p>}
      </div>
      <button onClick={onClose} className="flex-shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors">
        <X size={16} />
      </button>
    </div>
  )
}
