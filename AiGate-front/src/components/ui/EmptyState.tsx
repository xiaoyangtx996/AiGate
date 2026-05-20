import { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className || ''}`}>
      <Icon size={48} />
      <h3 className="text-lg font-medium mt-4">{title}</h3>
      {description && <p className="text-sm mt-2 max-w-md">{description}</p>}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}
