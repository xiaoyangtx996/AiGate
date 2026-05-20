import { useState, useMemo, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'
import {
  ShieldPlus,
  Search,
  Edit,
  Trash2,
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
  Settings,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoleRow {
  id: string
  name: string
  code: string
  sort: number
  status: 'active' | 'disabled'
  remark?: string
  menuKeys: string[]
  createdAt: string
}

/* ------------------------------------------------------------------ */
/*  Permission Tree Data                                               */
/* ------------------------------------------------------------------ */

interface TreeNode {
  key: string
  label: string
  children?: TreeNode[]
}

const menuTree: TreeNode[] = [
  {
    key: 'data-center',
    label: '数据中心',
    children: [
      { key: 'dashboard', label: '数据大盘' },
      { key: 'workspace', label: '我的工作台' },
    ],
  },
  {
    key: 'org-governance',
    label: '组织治理',
    children: [
      { key: 'organization', label: '组织与配额' },
      { key: 'users', label: '用户管理' },
      { key: 'role-manage', label: '角色管理' },
      { key: 'quota-approval', label: '配额申请审批' },
    ],
  },
  {
    key: 'gateway',
    label: '网关与接入',
    children: [
      { key: 'channels', label: '渠道管理' },
      { key: 'models', label: '模型资产' },
      { key: 'keys', label: '密钥管理' },
      { key: 'logs', label: '调用日志' },
    ],
  },
  {
    key: 'knowledge',
    label: '知识库',
    children: [
      { key: 'knowledge-list', label: '项目知识库' },
    ],
  },
  {
    key: 'assets',
    label: 'AI 资产市场',
    children: [
      { key: 'prompts', label: '提示词库' },
      { key: 'mcp', label: 'MCP 工具' },
      { key: 'skills', label: 'Skills 技能库' },
      { key: 'plugins', label: 'Plugins 插件库' },
      { key: 'hooks', label: 'Hooks 钩子库' },
    ],
  },
  {
    key: 'agent',
    label: 'Agent 中心',
    children: [
      { key: 'agent-center', label: 'Agent 管理' },
    ],
  },
  {
    key: 'monitoring',
    label: '监控与合规',
    children: [
      { key: 'alerts', label: '预警中心' },
      { key: 'audit', label: '操作审计' },
    ],
  },
  {
    key: 'system',
    label: '系统',
    children: [
      { key: 'settings', label: '系统设置' },
      { key: 'status', label: '系统状态' },
      { key: 'developer', label: '开发者中心' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const mockRoles: RoleRow[] = [
  {
    id: '1',
    name: '集团 IT 管理员',
    code: 'sys_admin',
    sort: 1,
    status: 'active',
    remark: '拥有系统全部权限，可管理所有组织和用户',
    menuKeys: menuTree.flatMap((g) => [g.key, ...(g.children?.map((c) => c.key) || [])]),
    createdAt: '2026-01-01',
  },
  {
    id: '2',
    name: '分公司管理员',
    code: 'tenant_admin',
    sort: 2,
    status: 'active',
    remark: '管理本公司范围内的用户、配额和资产',
    menuKeys: ['data-center', 'dashboard', 'org-governance', 'organization', 'users', 'quota-approval', 'gateway', 'keys', 'logs', 'knowledge', 'knowledge-list', 'assets', 'prompts', 'mcp', 'skills', 'plugins', 'agent', 'agent-center', 'monitoring', 'alerts', 'system', 'settings'],
    createdAt: '2026-01-01',
  },
  {
    id: '3',
    name: '部门负责人',
    code: 'dept_lead',
    sort: 3,
    status: 'active',
    remark: '管理本部门成员和项目知识库',
    menuKeys: ['data-center', 'dashboard', 'org-governance', 'quota-approval', 'gateway', 'keys', 'logs', 'knowledge', 'knowledge-list', 'assets', 'prompts', 'skills', 'agent', 'agent-center', 'monitoring', 'alerts'],
    createdAt: '2026-01-15',
  },
  {
    id: '4',
    name: '项目负责人',
    code: 'project_lead',
    sort: 4,
    status: 'active',
    remark: '管理项目内的知识库和 AI 资产',
    menuKeys: ['data-center', 'dashboard', 'org-governance', 'quota-approval', 'gateway', 'keys', 'logs', 'knowledge', 'knowledge-list', 'assets', 'prompts', 'skills', 'agent', 'agent-center'],
    createdAt: '2026-02-01',
  },
  {
    id: '5',
    name: '普通员工',
    code: 'user',
    sort: 5,
    status: 'active',
    remark: '基础使用权限，可查看工作台和使用密钥',
    menuKeys: ['data-center', 'workspace', 'gateway', 'keys', 'logs', 'assets', 'prompts', 'agent', 'agent-center'],
    createdAt: '2026-02-01',
  },
  {
    id: '6',
    name: '访客角色',
    code: 'guest',
    sort: 6,
    status: 'disabled',
    remark: '临时访客权限，仅可查看公开资源',
    menuKeys: ['data-center', 'workspace'],
    createdAt: '2026-03-10',
  },
]

const STATUS_LABELS: Record<string, string> = {
  active: '正常',
  disabled: '已停用',
}

/* ------------------------------------------------------------------ */
/*  Permission Tree Component                                          */
/* ------------------------------------------------------------------ */

function PermissionTree({
  checkedKeys,
  onChange,
}: {
  checkedKeys: Set<string>
  onChange: (keys: Set<string>) => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(menuTree.map((g) => g.key))
  )

  const toggleExpand = (key: string) => {
    const next = new Set(expandedGroups)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setExpandedGroups(next)
  }

  const toggleCheck = (key: string) => {
    const next = new Set(checkedKeys)
    if (next.has(key)) {
      next.delete(key)
      // If unchecking a group, uncheck all children
      const group = menuTree.find((g) => g.key === key)
      if (group?.children) {
        group.children.forEach((c) => next.delete(c.key))
      }
    } else {
      next.add(key)
      // If checking a child, also check parent group
      const parent = menuTree.find((g) => g.children?.some((c) => c.key === key))
      if (parent) {
        next.add(parent.key)
      }
    }
    onChange(next)
  }

  const toggleGroupAll = (groupKey: string, children: TreeNode[]) => {
    const next = new Set(checkedKeys)
    const allChecked = children.every((c) => next.has(c.key))
    if (allChecked) {
      children.forEach((c) => next.delete(c.key))
      next.delete(groupKey)
    } else {
      children.forEach((c) => next.add(c.key))
      next.add(groupKey)
    }
    onChange(next)
  }

  const isGroupAllChecked = (children: TreeNode[]) => {
    return children.length > 0 && children.every((c) => checkedKeys.has(c.key))
  }

  const isGroupPartial = (children: TreeNode[]) => {
    return children.some((c) => checkedKeys.has(c.key)) && !isGroupAllChecked(children)
  }

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div
        className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-b"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
        }}
      >
        菜单权限
      </div>
      <div className="max-h-[400px] overflow-y-auto p-2">
        {menuTree.map((group) => (
          <div key={group.key} className="mb-1">
            {/* Group header */}
            <div className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-elevated transition-colors">
              <button
                className="p-0.5"
                onClick={() => toggleExpand(group.key)}
              >
                {expandedGroups.has(group.key) ? (
                  <ChevronDown size={14} className="text-secondary" />
                ) : (
                  <ChevronRight size={14} className="text-secondary" />
                )}
              </button>
              <button
                className="flex items-center gap-2 flex-1 text-left"
                onClick={() => {
                  if (group.children) {
                    toggleGroupAll(group.key, group.children)
                  } else {
                    toggleCheck(group.key)
                  }
                }}
              >
                <span
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: isGroupAllChecked(group.children || [])
                      ? 'var(--brand-main)'
                      : isGroupPartial(group.children || [])
                        ? 'var(--brand-main)'
                        : 'var(--border-color)',
                    backgroundColor: isGroupAllChecked(group.children || []) || isGroupPartial(group.children || [])
                      ? 'var(--brand-main)'
                      : 'transparent',
                  }}
                >
                  {isGroupAllChecked(group.children || []) && (
                    <Check size={12} className="text-white" />
                  )}
                  {isGroupPartial(group.children || []) && (
                    <div className="w-2 h-0.5 bg-white rounded" />
                  )}
                </span>
                <span className="text-sm font-medium">{group.label}</span>
              </button>
            </div>
            {/* Children */}
            {expandedGroups.has(group.key) && group.children && (
              <div className="ml-7 space-y-0.5">
                {group.children.map((child) => (
                  <button
                    key={child.key}
                    className="flex items-center gap-2 w-full px-2 py-1 rounded text-sm hover:bg-elevated transition-colors"
                    onClick={() => toggleCheck(child.key)}
                  >
                    <span
                      className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                      style={{
                        borderColor: checkedKeys.has(child.key) ? 'var(--brand-main)' : 'var(--border-color)',
                        backgroundColor: checkedKeys.has(child.key) ? 'var(--brand-main)' : 'transparent',
                      }}
                    >
                      {checkedKeys.has(child.key) && (
                        <Check size={12} className="text-white" />
                      )}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{child.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RoleManage() {
  const { addToast } = useUIStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: string; roleId?: string } | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formSort, setFormSort] = useState('0')
  const [formStatus, setFormStatus] = useState<'active' | 'disabled'>('active')
  const [formRemark, setFormRemark] = useState('')
  const [formMenuKeys, setFormMenuKeys] = useState<Set<string>>(new Set())

  // Filter roles
  const filteredRoles = useMemo(() => {
    return mockRoles.filter((role) => {
      const matchesSearch =
        !search ||
        role.name.toLowerCase().includes(search.toLowerCase()) ||
        role.code.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || role.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter])

  // Reset form
  const resetForm = useCallback(() => {
    setFormName('')
    setFormCode('')
    setFormSort('0')
    setFormStatus('active')
    setFormRemark('')
    setFormMenuKeys(new Set())
    setEditingRole(null)
  }, [])

  // Open add modal
  const handleAdd = useCallback(() => {
    resetForm()
    setIsModalOpen(true)
  }, [resetForm])

  // Open edit modal
  const handleEdit = useCallback((role: RoleRow) => {
    setEditingRole(role)
    setFormName(role.name)
    setFormCode(role.code)
    setFormSort(String(role.sort))
    setFormStatus(role.status)
    setFormRemark(role.remark || '')
    setFormMenuKeys(new Set(role.menuKeys))
    setIsModalOpen(true)
  }, [])

  // Save role
  const handleSave = useCallback(() => {
    if (!formName.trim()) {
      addToast({ type: 'error', title: '请填写角色名称' })
      return
    }
    if (!formCode.trim()) {
      addToast({ type: 'error', title: '请填写角色标识' })
      return
    }

    addToast({
      type: 'success',
      title: editingRole ? '编辑成功' : '新增成功',
      message: `角色「${formName}」已${editingRole ? '更新' : '创建'}`,
    })
    setIsModalOpen(false)
    resetForm()
  }, [formName, formCode, editingRole, addToast, resetForm])

  // Delete role
  const handleDelete = useCallback((roleId: string) => {
    setConfirmAction({ type: 'delete', roleId })
  }, [])

  // Confirm action
  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return

    if (confirmAction.type === 'delete') {
      addToast({ type: 'success', title: '删除成功', message: '角色已删除' })
    }

    setConfirmAction(null)
  }, [confirmAction, addToast])

  // Count menu permissions
  const countLeafKeys = (keys: Set<string>) => {
    let count = 0
    menuTree.forEach((group) => {
      if (group.children) {
        group.children.forEach((child) => {
          if (keys.has(child.key)) count++
        })
      }
    })
    return count
  }

  return (
    <div>
      <PageHeader
        title="角色管理"
        subtitle="管理系统角色及其菜单权限分配，控制不同角色的功能访问范围。"
        breadcrumbs={[{ label: '组织治理' }, { label: '角色管理' }]}
        actions={
          <Button icon={<ShieldPlus size={16} />} onClick={handleAdd}>
            新增角色
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        {/* Filter Bar */}
        <div
          className="p-4 border-b flex flex-wrap gap-4 items-center"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="w-64">
            <Input
              placeholder="搜索角色名称或标识..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-32"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">正常</option>
            <option value="disabled">已停用</option>
          </select>
          <div className="ml-auto text-sm text-secondary">
            共 {filteredRoles.length} 个角色
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">角色名称</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">角色标识</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">排序</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">状态</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">备注</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">创建时间</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredRoles.map((role) => (
                <tr
                  key={role.id}
                  className="border-b transition-colors hover:bg-elevated"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-secondary" />
                      <span className="font-bold">{role.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <code
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--brand-main)',
                      }}
                    >
                      {role.code}
                    </code>
                  </td>
                  <td className="p-4 font-mono text-xs">{role.sort}</td>
                  <td className="p-4">
                    <Badge variant={role.status === 'active' ? 'success' : 'error'}>
                      {STATUS_LABELS[role.status]}
                    </Badge>
                  </td>
                  <td className="p-4 text-secondary max-w-[200px] truncate">
                    {role.remark || '-'}
                  </td>
                  <td className="p-4 text-xs text-secondary">{role.createdAt}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-elevated transition-colors"
                        title="编辑"
                        onClick={() => handleEdit(role)}
                      >
                        <Edit size={14} className="text-secondary" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-elevated transition-colors"
                        title="权限配置"
                        onClick={() => handleEdit(role)}
                      >
                        <Settings size={14} className="text-secondary" />
                      </button>
                      {role.code !== 'sys_admin' && (
                        <button
                          className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                          title="删除"
                          onClick={() => handleDelete(role.id)}
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredRoles.length === 0 && (
          <EmptyState
            icon={Shield}
            title="暂无角色"
            description={search || statusFilter !== 'all' ? '没有匹配的角色' : '还没有创建任何角色'}
            action={
              !search && statusFilter === 'all'
                ? { label: '新增角色', onClick: handleAdd }
                : undefined
            }
          />
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingRole ? '编辑角色' : '新增角色'}
        description={editingRole ? '修改角色信息和权限配置' : '创建新的系统角色并配置权限'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="角色名称"
            placeholder="如：部门负责人"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Input
            label="角色标识"
            placeholder="如：dept_lead"
            required
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            disabled={!!editingRole}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="排序"
              type="number"
              placeholder="0"
              value={formSort}
              onChange={(e) => setFormSort(e.target.value)}
            />
            <div className="w-full">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                状态
              </label>
              <select
                className="input w-full"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'active' | 'disabled')}
              >
                <option value="active">正常</option>
                <option value="disabled">已停用</option>
              </select>
            </div>
          </div>
          <div className="w-full">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              备注
            </label>
            <textarea
              className="input w-full"
              rows={3}
              placeholder="角色描述..."
              value={formRemark}
              onChange={(e) => setFormRemark(e.target.value)}
            />
          </div>

          {/* Permission Tree */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              菜单权限
            </label>
            <p className="text-xs text-secondary mb-2">
              已选择 {countLeafKeys(formMenuKeys)} 个菜单权限
            </p>
            <PermissionTree
              checkedKeys={formMenuKeys}
              onChange={setFormMenuKeys}
            />
          </div>
        </div>
        <div
          className="flex justify-end gap-3 mt-6 pt-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Button
            variant="secondary"
            onClick={() => {
              setIsModalOpen(false)
              resetForm()
            }}
          >
            取消
          </Button>
          <Button onClick={handleSave}>
            {editingRole ? '保存修改' : '确认创建'}
          </Button>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title="确认删除角色"
        description="删除后该角色下的用户将失去对应权限，此操作不可撤销。"
        variant="danger"
        confirmText="确认删除"
      />
    </div>
  )
}
