import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Drawer({ isOpen, onClose, title, description, children, width = 'md', className }: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={twMerge(
          clsx(
            'card h-full overflow-y-auto animate-slide-in-right',
            { 'w-[480px]': width === 'sm', 'w-[640px]': width === 'md', 'w-[80vw]': width === 'lg' },
            className
          )
        )}
      >
        <div
          className="sticky top-0 bg-surface z-10 flex items-start justify-between pb-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="text-sm text-secondary mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-elevated transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="py-4">{children}</div>
      </div>
    </div>
  )
}
