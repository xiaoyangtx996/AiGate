import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, Lock } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-body)' }}>
      <div className="text-center">
        <Lock size={64} className="mx-auto text-error" />
        <h1 className="text-4xl font-bold mt-4">403</h1>
        <h2 className="text-2xl font-bold mt-2">权限不足</h2>
        <p className="text-secondary mt-2">您没有权限访问此页面，请联系管理员</p>
        <Link to="/" className="inline-block mt-8"><Button variant="primary" icon={<Home size={16} />}>返回首页</Button></Link>
      </div>
    </div>
  )
}
