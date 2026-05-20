import { twMerge } from 'tailwind-merge'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={twMerge('skeleton h-4', i === lines - 1 ? 'w-3/4' : undefined, className)} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={twMerge('skeleton', className)}
      style={{
        width,
        height,
        borderRadius: variant === 'circular' ? '9999px' : variant === 'rectangular' ? 'var(--border-radius-base)' : undefined,
      }}
    />
  )
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
