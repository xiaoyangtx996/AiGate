import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { UserPlus, Search, CreditCard, Ban, Users2 } from 'lucide-react'

interface UserRow {
  name: string
  email: string
  org: string
  quota: string
  quotaColor?: string
  role: string
  roleVariant: 'success' | 'warning'
}

const users: UserRow[] = [
  {
    name: '张三',
    email: 'zhangsan@company.com',
    org: '北京研发中心',
    quota: '¥ 500.00',
    role: '普通员工',
    roleVariant: 'success',
  },
  {
    name: '李四 (管理员)',
    email: 'lisi@company.com',
    org: '架构组',
    quota: '无限制',
    quotaColor: 'text-brand-main',
    role: '租户管理',
    roleVariant: 'warning',
  },
]

export default function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('全部角色')

  return (
    <div>
      <PageHeader
        title="用户管理"
        subtitle="管理系统和租户下的所有子账号、余额与角色分配。"
        breadcrumbs={[{ label: '组织治理' }, { label: '用户管理' }]}
        actions={
          <Button onClick={() => setIsModalOpen(true)} icon={<UserPlus size={16} />}>
            添加用户
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        {/* Filter Bar */}
        <div
          className="p-4 border-b flex gap-4 items-center"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-elevated)',
          }}
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
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option>全部角色</option>
            <option>租户管理员</option>
            <option>普通用户</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead
              className="border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                  用户名 / 邮箱
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                  归属组织
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                  个人额度 (CNY)
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                  角色
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map((user) => (
                <tr
                  key={user.email}
                  className="border-b transition-colors hover:bg-elevated"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <td className="p-4">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs text-secondary mt-1">
                      {user.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="neutral">{user.org}</Badge>
                  </td>
                  <td
                    className={`p-4 font-mono font-bold ${user.quotaColor || ''}`}
                  >
                    {user.quota}
                  </td>
                  <td className="p-4">
                    <Badge variant={user.roleVariant}>{user.role}</Badge>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-brand-main font-bold hover:underline mr-3 text-xs inline-flex items-center gap-1">
                      <CreditCard size={12} />
                      充值
                    </button>
                    <button className="text-secondary font-bold hover:text-brand-accent text-xs inline-flex items-center gap-1">
                      <Ban size={12} />
                      封禁
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="empty-state py-12">
            <Users2 size={48} />
            <h3 className="text-lg font-medium mt-4">暂无用户</h3>
            <p className="text-sm mt-2">还没有添加任何用户</p>
            <Button variant="primary" icon={<UserPlus size={16} />} className="mt-4" onClick={() => setIsModalOpen(true)}>
              添加第一个用户
            </Button>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="添加新用户"
      >
        <div className="space-y-4">
          <Input label="用户名" placeholder="如：王五" />
          <Input label="邮箱" type="email" placeholder="wangwu@company.com" />
          <div className="w-full">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              角色
            </label>
            <select className="input w-full">
              <option value="user">普通员工 (User)</option>
              <option value="project_lead">项目负责人 (Project Lead)</option>
              <option value="dept_lead">部门负责人 (Dept Lead)</option>
              <option value="tenant_admin">分公司管理员 (Tenant Admin)</option>
              <option value="sys_admin">集团 IT 管理员 (Sys Admin)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>
          <Button onClick={() => setIsModalOpen(false)}>确认保存</Button>
        </div>
      </Modal>
    </div>
  )
}
