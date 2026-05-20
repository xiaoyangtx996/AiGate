import { useState } from 'react'
import { ChevronDown, CheckCircle, Clock, XCircle, Circle } from 'lucide-react'
import { clsx } from 'clsx'

export type TimelineStatus = 'success' | 'active' | 'error' | 'pending'

interface TimelineItem {
  id: string
  title: string
  description?: string
  time?: string
  status: TimelineStatus
  details?: React.ReactNode
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

const statusConfig: Record<TimelineStatus, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  success: { icon: CheckCircle, color: 'var(--success)', bgColor: 'var(--success)' },
  active: { icon: Clock, color: 'var(--info)', bgColor: 'var(--info)' },
  error: { icon: XCircle, color: 'var(--error)', bgColor: 'var(--error)' },
  pending: { icon: Circle, color: 'var(--text-muted)', bgColor: 'var(--text-muted)' },
}

export function Timeline({ items, className }: TimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Vertical line */}
      <div
        className="absolute left-4 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: 'var(--border-color)' }}
      />

      {/* Timeline items */}
      <div className="space-y-6">
        {items.map((item) => {
          const config = statusConfig[item.status]
          const Icon = config.icon
          const isExpanded = expandedItems.has(item.id)
          const hasDetails = !!item.details

          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Icon */}
              <div
                className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: config.bgColor + '20' }}
              >
                <Icon size={16} style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-secondary mt-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.time && (
                      <span className="text-xs text-secondary">{item.time}</span>
                    )}
                    {hasDetails && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-1 rounded hover:bg-elevated transition-colors"
                      >
                        <ChevronDown
                          size={14}
                          className={clsx(
                            'text-secondary transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable details */}
                {hasDetails && isExpanded && (
                  <div
                    className="mt-3 p-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    {item.details}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
