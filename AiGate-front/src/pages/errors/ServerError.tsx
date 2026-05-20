import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, RefreshCw } from 'lucide-react'

export default function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-body)' }}>
      <div className="text-center">
        <h1 className="text-9xl font-bold text-error">500</h1>
        <h2 className="text-2xl font-bold mt-4">服务器错误</h2>
        <p className="text-secondary mt-2">服务器出现了问题，请稍后重试</p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link to="/"><Button variant="primary" icon={<Home size={16} />}>返回首页</Button></Link>
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => window.location.reload()}>刷新页面</Button>
        </div>
      </div>
    </div>
  )
}
