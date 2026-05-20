import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface Tab {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={twMerge('flex gap-1 p-1 bg-elevated rounded-lg', className)} style={{ backgroundColor: 'var(--bg-elevated)' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
            activeTab === tab.id ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
          )}
          style={{ backgroundColor: activeTab === tab.id ? 'var(--bg-surface)' : undefined }}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={clsx(
                'px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id ? 'bg-brand-main text-white' : 'bg-elevated text-secondary'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
