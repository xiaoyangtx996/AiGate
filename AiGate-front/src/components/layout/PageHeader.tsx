import React from 'react'
import { Breadcrumb } from './Breadcrumb'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: { label: string; path?: string }[]
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && <Breadcrumb items={breadcrumbs} className="mb-4" />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-secondary mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
