import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  FolderTree,
  Search,
  Eye,
  EyeOff,
  Save,
  Home,
  BarChart3,
  Users2,
  Building2,
  Key,
  FileText,
  Puzzle,
  BookOpen,
  Bot,
  Bell,
  Settings,
  ShieldCheck,
  Plug,
  Code2,
  Workflow,
  Palette,
  LayoutDashboard,
  Receipt,
} from 'lucide-react'

/* ---------- 类型定义 ---------- */

interface MenuItem {
  id: string
  name: string
  path: string
  icon: string
  sort: number
  status: 'enabled' | 'disabled'
  permission: string
  children?: MenuItem[]
}

interface MenuFormData {
  name: string
  path: string
  icon: string
  sort: number
  status: 'enabled' | 'disabled'
  permission: string
  parentId: string | null
}

/* ---------- 图标映射 ---------- */

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home size={16} />,
  BarChart3: <BarChart3 size={16} />,
  LayoutDashboard: <LayoutDashboard size={16} />,
  Building2: <Building2 size={16} />,
  Users2: <Users2 size={16} />,
  Key: <Key size={16} />,
  FileText: <FileText size={16} />,
  Puzzle: <Puzzle size={16} />,
  BookOpen: <BookOpen size={16} />,
  Bot: <Bot size={16} />,
  Bell: <Bell size={16} />,
  Settings: <Settings size={16} />,
  ShieldCheck: <ShieldCheck size={16} />,
  Plug: <Plug size={16} />,
  Code2: <Code2 size={16} />,
  Workflow: <Workflow size={16} />,
  Palette: <Palette size={16} />,
  Receipt: <Receipt size={16} />,
}

const iconOptions = Object.keys(iconMap)

/* ---------- 模拟数据 ---------- */

const initialMenus: MenuItem[] = [
  {
    id: '1',
    name: '数据中心',
    path: '',
    icon: 'BarChart3',
    sort: 1,
    status: 'enabled',
    permission: '',
    children: [
      { id: '1-1', name: '数据大盘', path: '/dashboard', icon: 'BarChart3', sort: 1, status: 'enabled', permission: 'sys_admin,tenant_admin,dept_lead,project_lead' },
      { id: '1-2', name: '我的工作台', path: '/workspace', icon: 'LayoutDashboard', sort: 2, status: 'enabled', permission: 'user' },
    ],
  },
  {
    id: '2',
    name: '组织治理',
    path: '',
    icon: 'Building2',
    sort: 2,
    status: 'enabled',
    permission: '',
    children: [
      { id: '2-1', name: '组织与配额', path: '/organization', icon: 'Building2', sort: 1, status: 'enabled', permission: 'sys_admin,tenant_admin' },
      { id: '2-2', name: '用户管理', path: '/users', icon: 'Users2', sort: 2, status: 'enabled', permission: 'sys_admin,tenant_admin' },
      { id: '2-3', name: '配额申请审批', path: '/quota-approval', icon: 'Receipt', sort: 3, status: 'enabled', permission: 'sys_admin,tenant_admin,dept_lead,project_lead' },
    ],
  },
  {
    id: '3',
    name: '网关与接入',
    path: '',
    icon: 'Plug',
    sort: 3,
    status: 'enabled',
    permission: '',
    children: [
      { id: '3-1', name: '渠道管理', path: '/channels', icon: 'Plug', sort: 1, status: 'enabled', permission: 'sys_admin' },
      { id: '3-2', name: '模型资产', path: '/models', icon: 'Puzzle', sort: 2, status: 'enabled', permission: 'sys_admin' },
      { id: '3-3', name: '密钥管理', path: '/keys', icon: 'Key', sort: 3, status: 'enabled', permission: '' },
      { id: '3-4', name: '调用日志', path: '/logs', icon: 'FileText', sort: 4, status: 'enabled', permission: '' },
    ],
  },
  {
    id: '4',
    name: '知识库',
    path: '/knowledge',
    icon: 'BookOpen',
    sort: 4,
    status: 'enabled',
    permission: 'sys_admin,dept_lead,project_lead',
  },
  {
    id: '5',
    name: 'AI 资产市场',
    path: '',
    icon: 'Puzzle',
    sort: 5,
    status: 'enabled',
    permission: '',
    children: [
      { id: '5-1', name: '提示词库', path: '/prompts', icon: 'FileText', sort: 1, status: 'enabled', permission: '' },
      { id: '5-2', name: 'MCP 工具', path: '/mcp', icon: 'Puzzle', sort: 2, status: 'enabled', permission: 'sys_admin,tenant_admin' },
      { id: '5-3', name: 'Skills 技能库', path: '/skills', icon: 'Workflow', sort: 3, status: 'enabled', permission: 'sys_admin,tenant_admin,project_lead' },
      { id: '5-4', name: 'Plugins 插件库', path: '/plugins', icon: 'Plug', sort: 4, status: 'enabled', permission: 'sys_admin,tenant_admin,project_lead' },
      { id: '5-5', name: 'Hooks 钩子库', path: '/hooks', icon: 'Code2', sort: 5, status: 'enabled', permission: 'sys_admin' },
    ],
  },
  {
    id: '6',
    name: 'Agent 中心',
    path: '/agent',
    icon: 'Bot',
    sort: 6,
    status: 'enabled',
    permission: '',
  },
  {
    id: '7',
    name: '监控与合规',
    path: '',
    icon: 'Bell',
    sort: 7,
    status: 'enabled',
    permission: '',
    children: [
      { id: '7-1', name: '预警中心', path: '/alerts', icon: 'Bell', sort: 1, status: 'enabled', permission: '' },
      { id: '7-2', name: '操作审计', path: '/audit', icon: 'ShieldCheck', sort: 2, status: 'enabled', permission: 'sys_admin' },
    ],
  },
  {
    id: '8',
    name: '系统',
    path: '',
    icon: 'Settings',
    sort: 8,
    status: 'enabled',
    permission: '',
    children: [
      { id: '8-1', name: '系统设置', path: '/settings', icon: 'Settings', sort: 1, status: 'enabled', permission: 'sys_admin,tenant_admin' },
      { id: '8-2', name: '菜单管理', path: '/menu-manage', icon: 'FolderTree', sort: 2, status: 'enabled', permission: 'sys_admin' },
      { id: '8-3', name: '设计系统', path: '/design-system', icon: 'Palette', sort: 3, status: 'enabled', permission: 'sys_admin' },
    ],
  },
]

/* ---------- 辅助函数 ---------- */

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function findItem(menus: MenuItem[], id: string): MenuItem | null {
  for (const item of menus) {
    if (item.id === id) return item
    if (item.children) {
      const found = findItem(item.children, id)
      if (found) return found
    }
  }
  return null
}

function removeItem(menus: MenuItem[], id: string): MenuItem[] {
  return menus
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children ? removeItem(item.children, id) : undefined,
    }))
}

function updateItem(menus: MenuItem[], id: string, updates: Partial<MenuItem>): MenuItem[] {
  return menus.map((item) => {
    if (item.id === id) return { ...item, ...updates }
    if (item.children) return { ...item, children: updateItem(item.children, id, updates) }
    return item
  })
}

function addItem(menus: MenuItem[], parentId: string | null, newItem: MenuItem): MenuItem[] {
  if (!parentId) return [...menus, newItem]
  return menus.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children || []), newItem] }
    }
    if (item.children) {
      return { ...item, children: addItem(item.children, parentId, newItem) }
    }
    return item
  })
}

function moveItem(menus: MenuItem[], dragId: string, dropId: string, position: 'before' | 'after' | 'inside'): MenuItem[] {
  const flat = flattenMenus(menus)
  const dragIdx = flat.findIndex((f) => f.id === dragId)
  const dropIdx = flat.findIndex((f) => f.id === dropId)
  if (dragIdx === -1 || dropIdx === -1 || dragIdx === dropIdx) return menus

  const dragItem = flat[dragIdx]

  // Remove from old position
  let newMenus = removeItem(menus, dragId)

  // Find the drop target in the tree
  const dropItem = findItem(newMenus, dropId)
  if (!dropItem) return menus

  if (position === 'inside') {
    return addItem(newMenus, dropId, dragItem)
  }

  // Insert before or after: find parent of drop item
  function insertRelative(tree: MenuItem[], targetId: string, newItem: MenuItem, pos: 'before' | 'after'): MenuItem[] {
    const result: MenuItem[] = []
    for (const item of tree) {
      if (item.id === targetId) {
        if (pos === 'before') result.push(newItem)
        result.push(item)
        if (pos === 'after') result.push(newItem)
      } else {
        result.push({
          ...item,
          children: item.children ? insertRelative(item.children, targetId, newItem, pos) : undefined,
        })
      }
    }
    return result
  }

  return insertRelative(newMenus, dropId, dragItem, position)
}

function flattenMenus(menus: MenuItem[], depth = 0): (MenuItem & { depth: number })[] {
  const result: (MenuItem & { depth: number })[] = []
  for (const item of menus) {
    result.push({ ...item, depth })
    if (item.children) {
      result.push(...flattenMenus(item.children, depth + 1))
    }
  }
  return result
}

/* ---------- 菜单树节点 ---------- */

function MenuTreeNode({
  item,
  depth,
  expandedIds,
  toggleExpand,
  onEdit,
  onDelete,
  onAddChild,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
  dropPosition,
}: {
  item: MenuItem
  depth: number
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  onAddChild: (parentId: string) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  dragOverId: string | null
  dropPosition: 'before' | 'after' | 'inside' | null
}) {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedIds.has(item.id)
  const isDragOver = dragOverId === item.id

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item.id)}
        onDragOver={(e) => onDragOver(e, item.id)}
        onDrop={(e) => onDrop(e, item.id)}
        className="group flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all cursor-grab active:cursor-grabbing"
        style={{
          paddingLeft: `${depth * 24 + 12}px`,
          backgroundColor: isDragOver
            ? dropPosition === 'inside'
              ? 'var(--brand-main)'
              : 'var(--bg-elevated)'
            : 'transparent',
          color: isDragOver && dropPosition === 'inside' ? '#fff' : 'var(--text-primary)',
          borderTop: isDragOver && dropPosition === 'before' ? '2px solid var(--brand-main)' : '2px solid transparent',
          borderBottom: isDragOver && dropPosition === 'after' ? '2px solid var(--brand-main)' : '2px solid transparent',
          opacity: item.status === 'disabled' ? 0.5 : 1,
        }}
      >
        {/* 拖拽手柄 */}
        <GripVertical size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--text-secondary)' }} />

        {/* 展开/折叠 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpand(item.id)
          }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <span className="w-2 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
          )}
        </button>

        {/* 图标 */}
        <span className="flex-shrink-0" style={{ color: 'var(--brand-main)' }}>
          {iconMap[item.icon] || <FileText size={16} />}
        </span>

        {/* 名称 */}
        <span className="flex-1 font-medium truncate">{item.name}</span>

        {/* 路径 */}
        {item.path && (
          <code className="flex-shrink-0 text-xs font-mono px-2 py-0.5 rounded hidden sm:inline-block" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            {item.path}
          </code>
        )}

        {/* 状态徽章 */}
        <Badge variant={item.status === 'enabled' ? 'success' : 'neutral'} size="sm">
          {item.status === 'enabled' ? '启用' : '禁用'}
        </Badge>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(item.id)
            }}
            className="p-1.5 rounded-md hover:bg-elevated transition-colors"
            title="添加子菜单"
          >
            <Plus size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            className="p-1.5 rounded-md hover:bg-elevated transition-colors"
            title="编辑"
          >
            <Edit3 size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item)
            }}
            className="p-1.5 rounded-md hover:bg-elevated transition-colors"
            title="删除"
          >
            <Trash2 size={14} className="text-error" />
          </button>
        </div>
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <MenuTreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverId={dragOverId}
              dropPosition={dropPosition}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- 菜单表单弹窗 ---------- */

function MenuFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: MenuFormData) => void
  initialData?: MenuFormData
  title: string
}) {
  const [form, setForm] = useState<MenuFormData>(
    initialData || {
      name: '',
      path: '',
      icon: 'FileText',
      sort: 0,
      status: 'enabled',
      permission: '',
      parentId: null,
    }
  )

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            菜单名称 <span className="text-error">*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="请输入菜单名称"
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            路由路径
          </label>
          <Input
            value={form.path}
            onChange={(e) => setForm({ ...form, path: e.target.value })}
            placeholder="例如: /dashboard（目录类型可留空）"
            className="w-full text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              图标
            </label>
            <select
              className="input text-sm px-3 py-2 rounded-lg w-full"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            >
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              排序
            </label>
            <Input
              value={form.sort}
              onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })}
              type="number"
              className="w-full text-sm"
              min={0}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            状态
          </label>
          <select
            className="input text-sm px-3 py-2 rounded-lg w-full"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'enabled' | 'disabled' })}
          >
            <option value="enabled">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            权限标识
          </label>
          <Input
            value={form.permission}
            onChange={(e) => setForm({ ...form, permission: e.target.value })}
            placeholder="例如: sys_admin,tenant_admin（多个用逗号分隔，留空表示所有角色）"
            className="w-full text-sm font-mono"
          />
        </div>
        {form.icon && (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span style={{ color: 'var(--brand-main)' }}>{iconMap[form.icon] || <FileText size={16} />}</span>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{form.name || '预览'}</span>
            {form.path && <code className="text-xs font-mono ml-auto" style={{ color: 'var(--text-secondary)' }}>{form.path}</code>}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button variant="primary" icon={<Save size={16} />} onClick={handleSubmit} disabled={!form.name.trim()}>
          保存
        </Button>
      </div>
    </Modal>
  )
}

/* ---------- 主页面 ---------- */

export default function MenuManage() {
  const [menus, setMenus] = useState<MenuItem[]>(initialMenus)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1', '2', '3', '5', '7', '8']))
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<MenuFormData | undefined>(undefined)
  const [formTitle, setFormTitle] = useState('新增菜单')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const allIds = new Set<string>()
    function collect(items: MenuItem[]) {
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          allIds.add(item.id)
          collect(item.children)
        }
      }
    }
    collect(menus)
    setExpandedIds(allIds)
  }, [menus])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  // CRUD operations
  const handleAddRoot = () => {
    setEditingId(null)
    setFormTitle('新增顶级菜单')
    setFormData({
      name: '',
      path: '',
      icon: 'FileText',
      sort: menus.length + 1,
      status: 'enabled',
      permission: '',
      parentId: null,
    })
    setFormOpen(true)
  }

  const handleAddChild = (parentId: string) => {
    const parent = findItem(menus, parentId)
    setEditingId(null)
    setFormTitle(`新增子菜单 - ${parent?.name || ''}`)
    setFormData({
      name: '',
      path: '',
      icon: 'FileText',
      sort: (parent?.children?.length || 0) + 1,
      status: 'enabled',
      permission: '',
      parentId,
    })
    setFormOpen(true)
  }

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id)
    setFormTitle('编辑菜单')
    setFormData({
      name: item.name,
      path: item.path,
      icon: item.icon,
      sort: item.sort,
      status: item.status,
      permission: item.permission,
      parentId: null,
    })
    setFormOpen(true)
  }

  const handleSave = (data: MenuFormData) => {
    if (editingId) {
      setMenus((prev) => updateItem(prev, editingId, {
        name: data.name,
        path: data.path,
        icon: data.icon,
        sort: data.sort,
        status: data.status,
        permission: data.permission,
      }))
    } else {
      const newItem: MenuItem = {
        id: generateId(),
        name: data.name,
        path: data.path,
        icon: data.icon,
        sort: data.sort,
        status: data.status,
        permission: data.permission,
        children: data.parentId ? undefined : [],
      }
      setMenus((prev) => addItem(prev, data.parentId, newItem))
      // Auto expand parent
      if (data.parentId) {
        setExpandedIds((prev) => new Set([...prev, data.parentId!]))
      }
    }
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      setMenus((prev) => removeItem(prev, deleteTarget.id))
      setDeleteTarget(null)
    }
  }

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragSourceId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id === dragSourceId) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    if (y < height * 0.25) {
      setDropPosition('before')
    } else if (y > height * 0.75) {
      setDropPosition('after')
    } else {
      setDropPosition('inside')
    }
    setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (dragSourceId && dragSourceId !== targetId && dropPosition) {
      setMenus((prev) => moveItem(prev, dragSourceId, targetId, dropPosition))
    }
    setDragOverId(null)
    setDropPosition(null)
    setDragSourceId(null)
  }

  // Search filter
  const filterMenus = (items: MenuItem[], query: string): MenuItem[] => {
    if (!query) return items
    return items
      .map((item) => {
        const childMatch = item.children ? filterMenus(item.children, query) : []
        const selfMatch = item.name.toLowerCase().includes(query.toLowerCase()) || item.path.toLowerCase().includes(query.toLowerCase())
        if (selfMatch || childMatch.length > 0) {
          return { ...item, children: childMatch.length > 0 ? childMatch : item.children }
        }
        return null
      })
      .filter(Boolean) as MenuItem[]
  }

  const displayMenus = searchQuery ? filterMenus(menus, searchQuery) : menus

  // Stats
  const totalCount = flattenMenus(menus).length
  const enabledCount = flattenMenus(menus).filter((m) => m.status === 'enabled').length
  const disabledCount = totalCount - enabledCount

  return (
    <div>
      <PageHeader
        title="菜单管理"
        subtitle="配置系统导航菜单的结构、权限与排序"
        breadcrumbs={[{ label: '系统' }, { label: '菜单管理' }]}
        actions={
          <Button icon={<Plus size={16} />} onClick={handleAddRoot}>
            新增顶级菜单
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-main)', opacity: 0.1 }}>
              <FolderTree size={20} style={{ color: 'var(--brand-main)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>菜单总数</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-main)', opacity: 0.1 }}>
              <Eye size={20} style={{ color: 'var(--brand-main)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{enabledCount}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>已启用</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <EyeOff size={20} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{disabledCount}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>已禁用</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 工具栏 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索菜单名称或路径..."
                className="pl-9 w-full text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>展开全部</Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>折叠全部</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 菜单树 */}
      <Card>
        <CardContent className="p-2">
          {displayMenus.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="暂无菜单数据"
              description="点击「新增顶级菜单」创建第一个菜单项"
              action={{ label: '新增顶级菜单', onClick: handleAddRoot }}
            />
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                setDragOverId(null)
                setDropPosition(null)
              }}
              onDrop={() => {
                setDragOverId(null)
                setDropPosition(null)
                setDragSourceId(null)
              }}
            >
              {displayMenus.map((item) => (
                <MenuTreeNode
                  key={item.id}
                  item={item}
                  depth={0}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onAddChild={handleAddChild}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  dragOverId={dragOverId}
                  dropPosition={dropPosition}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 底部提示 */}
      <p className="text-xs mt-4 px-1" style={{ color: 'var(--text-secondary)' }}>
        提示：拖拽菜单项可调整排序和层级关系。拖到目标上方 25% 为「移到前面」，中间 50% 为「移到内部」，下方 25% 为「移到后面」。
      </p>

      {/* 表单弹窗 */}
      {formOpen && (
        <MenuFormModal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          initialData={formData}
          title={formTitle}
        />
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除菜单"
        description={`确定要删除菜单「${deleteTarget?.name}」吗？${deleteTarget?.children?.length ? '该菜单下的所有子菜单也将被删除。' : ''}此操作不可撤销。`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        requireConfirmWord="DELETE"
      />
    </div>
  )
}
