# 全局组件沉淀实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 ConfirmDialog 和 Timeline 两个通用组件

**Architecture:** 新增两个 UI 组件，遵循现有组件模式

**Tech Stack:** React 18, TypeScript, Lucide React

---

## 文件结构

```
AiGate-front/src/components/ui/
├── ConfirmDialog.tsx    # 新增：确认对话框
└── Timeline.tsx         # 新增：时间线组件
```

---

## Task 1: 创建 ConfirmDialog 组件

**Files:**
- Create: `AiGate-front/src/components/ui/ConfirmDialog.tsx`

- [ ] **Step 1: 创建 ConfirmDialog 组件**

```typescript
// AiGate-front/src/components/ui/ConfirmDialog.tsx
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
```

- [ ] **Step 2: 验证组件**

运行 `npm run type-check` 确保无类型错误

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/components/ui/ConfirmDialog.tsx
git commit -m "feat: 创建 ConfirmDialog 确认对话框组件"
```

---

## Task 2: 创建 Timeline 组件

**Files:**
- Create: `AiGate-front/src/components/ui/Timeline.tsx`

- [ ] **Step 1: 创建 Timeline 组件**

```typescript
// AiGate-front/src/components/ui/Timeline.tsx
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
        {items.map((item, index) => {
          const config = statusConfig[item.status]
          const Icon = config.icon
          const isExpanded = expandedItems.has(item.id)
          const hasDetails = item.details

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
```

- [ ] **Step 2: 验证组件**

运行 `npm run type-check` 确保无类型错误

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/components/ui/Timeline.tsx
git commit -m "feat: 创建 Timeline 时间线组件"
```

---

## Task 3: 最终验证

- [ ] **Step 1: 运行构建**

```bash
cd AiGate-front && npm run build
```

预期：构建成功

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "feat: 沉淀全局组件（ConfirmDialog、Timeline）"
```

---

## 验收清单

### ConfirmDialog

- [ ] 支持 danger/warning/info 三种变体
- [ ] 支持输入确认词验证
- [ ] 支持 loading 状态
- [ ] 点击遮罩关闭
- [ ] Esc 关闭

### Timeline

- [ ] 支持 success/active/error/pending 四种状态
- [ ] 支持展开/折叠详情
- [ ] 垂直线连接节点
- [ ] 显示时间信息

---

**计划完成，保存到 `docs/superpowers/plans/2026-05-20-global-components.md`**

选择执行方式：
1. **Subagent-Driven** - 每个任务分发子代理
2. **Inline Execution** - 当前会话批量执行
