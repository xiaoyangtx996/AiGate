import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

export function Card({ children, className, hover = false, onClick, style }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx('card', hover && 'hover:border-brand-main cursor-pointer', onClick && 'cursor-pointer', className)
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={twMerge('flex items-center justify-between mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={twMerge('text-lg font-semibold', className)}>{children}</h3>
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={twMerge('', className)}>{children}</div>
}
