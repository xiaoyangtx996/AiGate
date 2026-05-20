import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui'
import {
  UserPlus,
  Search,
  CreditCard,
  Ban,
  Users2,
  Upload,
  Eye,
  Edit,
  Key,
  Shield,
  Mail,
  Phone,
  Building2,
  Calendar,
  Activity,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type UserRole = 'sys_admin' | 'tenant_admin' | 'dept_lead' | 'project_lead' | 'user'

interface UserRow {
  id: string
  name: string
  email: string
  phone?: string
  org: string
  department?: string
  quota: number
  quotaUsed: number
  role: UserRole
  status: 'active' | 'disabled' | 'locked'
  lastLogin?: string
  createdAt: string
  keyCount: number
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const mockUsers: UserRow[] = [
  {
    id: '1',
    name: '张三',
    email: 'zhangsan@company.com',
    phone: '138****1234',
    org: '北京研发中心',
    department: 'AI 架构部',
    quota: 5000,
    quotaUsed: 3200,
    role: 'sys_admin',
    status: 'active',
    lastLogin: '2026-05-20 14:30',
    createdAt: '2026-01-15',
    keyCount: 2,
  },
  {
    id: '2',
    name: '李四',
    email: 'lisi@company.com',
    phone: '139****5678',
    org: '北京研发中心',
    department: '前端开发组',
    quota: 2000,
    quotaUsed: 1800,
    role: 'tenant_admin',
    status: 'active',
    lastLogin: '2026-05-19 10:15',
    createdAt: '2026-02-01',
    keyCount: 3,
  },
  {
    id: '3',
    name: '王五',
    email: 'wangwu@company.com',
    org: '上海分公司',
    department: '产品部',
    quota: 1000,
    quotaUsed: 450,
    role: 'dept_lead',
    status: 'active',
    lastLogin: '2026-05-18 16:45',
    createdAt: '2026-03-10',
    keyCount: 1,
  },
  {
    id: '4',
    name: '赵六',
    email: 'zhaoliu@company.com',
    org: '北京研发中心',
    department: '后端开发组',
    quota: 1000,
    quotaUsed: 980,
    role: 'user',
    status: 'active',
    lastLogin: '2026-05-20 09:00',
    createdAt: '2026-04-05',
    keyCount: 2,
  },
  {
    id: '5',
    name: '钱七',
    email: 'qianqi@company.com',
    org: '深圳分公司',
    department: '测试组',
    quota: 500,
    quotaUsed: 120,
    role: 'user',
    status: 'disabled',
    lastLogin: '2026-04-30 11:20',
    createdAt: '2026-04-20',
    keyCount: 0,
  },
]

const ROLE_LABELS: Record<UserRole, string> = {
  sys_admin: '集团 IT 管理员',
  tenant_admin: '分公司管理员',
  dept_lead: '部门负责人',
  project_lead: '项目负责人',
  user: '普通员工',
}

const ROLE_VARIANTS: Record<UserRole, 'success' | 'warning' | 'info' | 'neutral'> = {
  sys_admin: 'warning',
  tenant_admin: 'info',
  dept_lead: 'success',
  project_lead: 'success',
  user: 'neutral',
}

const STATUS_LABELS: Record<string, string> = {
  active: '正常',
  disabled: '已停用',
  locked: '已锁定',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Users() {
  const { addToast } = useUIStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId?: string } | null>(null)

  // Filter users
  const filteredUsers = useMemo(() => {
    return mockUsers.filter((user) => {
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [search, roleFilter, statusFilter])

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  // Select all
  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  // Handle actions
  const handleViewDetail = (user: UserRow) => {
    setDrawerUser(user)
  }

  const handleBanUser = (userId: string) => {
    setConfirmAction({ type: 'ban', userId })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'ban') {
      addToast({ type: 'success', title: '操作成功', message: '用户已封禁' })
    } else if (confirmAction.type === 'batch-ban') {
      addToast({ type: 'success', title: '批量操作成功', message: `已封禁 ${selectedUsers.size} 个用户` })
      setSelectedUsers(new Set())
    }

    setConfirmAction(null)
  }

  // Calculate quota percentage
  const getQuotaPercent = (user: UserRow) => {
    return Math.round((user.quotaUsed / user.quota) * 100)
  }

  return (
    <div>
      <PageHeader
        title="用户管理"
        subtitle="管理系统和租户下的所有子账号、余额与角色分配。"
        breadcrumbs={[{ label: '组织治理' }, { label: '用户管理' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Upload size={16} />} onClick={() => setIsImportModalOpen(true)}>
              批量导入
            </Button>
            <Button icon={<UserPlus size={16} />} onClick={() => setIsAddModalOpen(true)}>
              添加用户
            </Button>
          </div>
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
              placeholder="搜索用户名或邮箱..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-40"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          >
            <option value="all">全部角色</option>
            <option value="sys_admin">集团 IT 管理员</option>
            <option value="tenant_admin">分公司管理员</option>
            <option value="dept_lead">部门负责人</option>
            <option value="project_lead">项目负责人</option>
            <option value="user">普通员工</option>
          </select>
          <select
            className="input w-32"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">正常</option>
            <option value="disabled">已停用</option>
            <option value="locked">已锁定</option>
          </select>
          <div className="ml-auto text-sm text-secondary">
            共 {filteredUsers.length} 个用户
          </div>
        </div>

        {/* Batch Actions */}
        {selectedUsers.size > 0 && (
          <div
            className="px-4 py-3 border-b flex items-center gap-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface))' }}
          >
            <span className="text-sm font-medium">已选中 {selectedUsers.size} 项</span>
            <Button variant="secondary" size="sm" icon={<CreditCard size={14} />}>
              批量充值
            </Button>
            <Button variant="secondary" size="sm" icon={<Shield size={14} />}>
              批量分配角色
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Ban size={14} />}
              onClick={() => setConfirmAction({ type: 'batch-ban' })}
            >
              批量封禁
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-[var(--brand-main)]"
                  />
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">用户名 / 邮箱</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">归属组织</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">配额使用</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">角色</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">状态</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">最后登录</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredUsers.map((user) => {
                const quotaPercent = getQuotaPercent(user)
                return (
                  <tr
                    key={user.id}
                    className="border-b transition-colors hover:bg-elevated cursor-pointer"
                    style={{ borderColor: 'var(--border-color)' }}
                    onClick={() => handleViewDetail(user)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="accent-[var(--brand-main)]"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold">{user.name}</div>
                      <div className="text-xs text-secondary mt-1">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="neutral">{user.org}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px]">
                          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${quotaPercent}%`,
                                backgroundColor: quotaPercent > 90 ? 'var(--error)' : quotaPercent > 70 ? 'var(--warning)' : 'var(--brand-main)',
                              }}
                            />
                          </div>
                        </div>
                        <span className="font-mono text-xs">{quotaPercent}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={ROLE_VARIANTS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.status === 'active' ? 'success' : 'error'}>
                        {STATUS_LABELS[user.status]}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-secondary">{user.lastLogin || '-'}</td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-elevated transition-colors"
                          title="查看详情"
                          onClick={() => handleViewDetail(user)}
                        >
                          <Eye size={14} className="text-secondary" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-elevated transition-colors" title="编辑">
                          <Edit size={14} className="text-secondary" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-elevated transition-colors" title="密钥管理">
                          <Key size={14} className="text-secondary" />
                        </button>
                        {user.status === 'active' && (
                          <button
                            className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                            title="封禁"
                            onClick={() => handleBanUser(user.id)}
                          >
                            <Ban size={14} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <EmptyState
            icon={Users2}
            title="暂无用户"
            description={search || roleFilter !== 'all' || statusFilter !== 'all' ? '没有匹配的用户' : '还没有添加任何用户'}
            action={
              !search && roleFilter === 'all' && statusFilter === 'all'
                ? { label: '添加第一个用户', onClick: () => setIsAddModalOpen(true) }
                : undefined
            }
          />
        )}
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="添加新用户"
        description="创建新的用户账号并分配角色"
      >
        <div className="space-y-4">
          <Input label="用户名" placeholder="如：王五" required />
          <Input label="邮箱" type="email" placeholder="wangwu@company.com" required />
          <Input label="手机号" type="tel" placeholder="138****1234" />
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              归属组织
            </label>
            <select className="input w-full">
              <option>北京研发中心</option>
              <option>上海分公司</option>
              <option>深圳分公司</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              角色
            </label>
            <select className="input w-full">
              <option value="user">普通员工</option>
              <option value="project_lead">项目负责人</option>
              <option value="dept_lead">部门负责人</option>
              <option value="tenant_admin">分公司管理员</option>
              <option value="sys_admin">集团 IT 管理员</option>
            </select>
          </div>
          <Input label="个人配额 (CNY)" type="number" placeholder="1000" />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>取消</Button>
          <Button onClick={() => {
            addToast({ type: 'success', title: '添加成功' })
            setIsAddModalOpen(false)
          }}>
            确认添加
          </Button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="批量导入用户"
        description="通过 CSV 文件批量导入用户"
      >
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-brand-main transition-colors"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Upload size={32} className="mx-auto mb-4 text-secondary" />
            <p className="text-sm font-medium mb-1">点击或拖拽文件到此处</p>
            <p className="text-xs text-secondary">支持 .csv 格式，单次最多 100 条</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">下载模板</Button>
            <span className="text-xs text-secondary">请先下载模板，按格式填写后上传</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>取消</Button>
          <Button onClick={() => {
            addToast({ type: 'success', title: '导入成功', message: '已导入 5 个用户' })
            setIsImportModalOpen(false)
          }}>
            开始导入
          </Button>
        </div>
      </Modal>

      {/* User Detail Drawer */}
      <Drawer
        isOpen={!!drawerUser}
        onClose={() => setDrawerUser(null)}
        title="用户详情"
        width="md"
      >
        {drawerUser && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: 'var(--brand-main)', color: 'white' }}
              >
                {drawerUser.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="text-lg font-bold">{drawerUser.name}</h3>
                <Badge variant={ROLE_VARIANTS[drawerUser.role]} className="mt-1">
                  {ROLE_LABELS[drawerUser.role]}
                </Badge>
              </div>
            </div>

            {/* Contact Info */}
            <Card>
              <h4 className="font-bold mb-3">联系方式</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-secondary" />
                  <span>{drawerUser.email}</span>
                </div>
                {drawerUser.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-secondary" />
                    <span>{drawerUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-secondary" />
                  <span>{drawerUser.org} / {drawerUser.department}</span>
                </div>
              </div>
            </Card>

            {/* Quota */}
            <Card>
              <h4 className="font-bold mb-3">配额使用</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>已使用 / 总额</span>
                    <span className="font-mono">{drawerUser.quotaUsed} / {drawerUser.quota} CNY</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${getQuotaPercent(drawerUser)}%`,
                        backgroundColor: getQuotaPercent(drawerUser) > 90 ? 'var(--error)' : 'var(--brand-main)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-secondary" />
                  <span className="text-sm">活跃密钥: {drawerUser.keyCount} / 3</span>
                </div>
              </div>
            </Card>

            {/* Activity */}
            <Card>
              <h4 className="font-bold mb-3">活动记录</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-secondary" />
                  <span>创建时间: {drawerUser.createdAt}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-secondary" />
                  <span>最后登录: {drawerUser.lastLogin || '从未登录'}</span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" icon={<Edit size={16} />}>
                编辑信息
              </Button>
              <Button variant="secondary" className="flex-1" icon={<Key size={16} />}>
                管理密钥
              </Button>
            </div>
            {drawerUser.status === 'active' && (
              <Button
                variant="danger"
                className="w-full"
                icon={<Ban size={16} />}
                onClick={() => {
                  setDrawerUser(null)
                  handleBanUser(drawerUser.id)
                }}
              >
                封禁用户
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'batch-ban' ? '确认批量封禁' : '确认封禁用户'}
        description={
          confirmAction?.type === 'batch-ban'
            ? `此操作将封禁选中的 ${selectedUsers.size} 个用户，其关联的密钥将被自动吊销。`
            : '此操作将封禁该用户，其关联的密钥将被自动吊销。'
        }
        variant="danger"
        confirmText="确认封禁"
      />
    </div>
  )
}
