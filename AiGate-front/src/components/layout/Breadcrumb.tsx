import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface BreadcrumbItem {
  label: string
  path?: string
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav className={clsx('flex items-center gap-2 text-sm', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={14} className="text-muted" />}
          {item.path ? (
            <Link to={item.path} className="text-secondary hover:text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-primary font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
