import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-body)' }}>
      <div className="text-center">
        <h1 className="text-9xl font-bold text-brand-main">404</h1>
        <h2 className="text-2xl font-bold mt-4">页面未找到</h2>
        <p className="text-secondary mt-2">您访问的页面不存在或已被移除</p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link to="/"><Button variant="primary" icon={<Home size={16} />}>返回首页</Button></Link>
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => window.history.back()}>返回上页</Button>
        </div>
      </div>
    </div>
  )
}
