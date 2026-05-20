import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'neutral', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'badge',
          {
            'badge-success': variant === 'success',
            'badge-warning': variant === 'warning',
            'badge-error': variant === 'error',
            'badge-info': variant === 'info',
            'badge-neutral': variant === 'neutral',
          },
          {
            'text-xs px-2 py-0.5': size === 'sm',
            'text-sm px-3 py-1': size === 'md',
          },
          className
        )
      )}
    >
      {children}
    </span>
  )
}
