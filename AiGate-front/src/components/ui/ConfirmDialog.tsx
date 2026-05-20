import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { clsx } from 'clsx'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  requireConfirmWord?: string
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  requireConfirmWord,
  loading = false,
}: ConfirmDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')

  if (!isOpen) return null

  const canConfirm = !requireConfirmWord || confirmInput === requireConfirmWord

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm()
    }
  }

  const handleClose = () => {
    setConfirmInput('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              variant === 'danger' && 'bg-error/10',
              variant === 'warning' && 'bg-warning/10',
              variant === 'info' && 'bg-info/10'
            )}
          >
            <AlertTriangle
              size={20}
              className={clsx(
                variant === 'danger' && 'text-error',
                variant === 'warning' && 'text-warning',
                variant === 'info' && 'text-info'
              )}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-secondary mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Confirm word input */}
        {requireConfirmWord && (
          <div className="mb-4">
            <p className="text-sm text-secondary mb-2">
              请输入 <span className="font-mono font-bold text-primary">{requireConfirmWord}</span> 以确认操作
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={requireConfirmWord}
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={handleClose}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={!canConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
