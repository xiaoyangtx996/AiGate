import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import {
  Home,
  ArrowLeft,
  RefreshCw,
  FileQuestion,
  Search,
  MapPin,
  BookOpen,
  Mail,
  Compass,
} from 'lucide-react'

const floatKeyframes = `
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 0.2; }
  100% { transform: scale(0.9); opacity: 0.5; }
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(6px, -8px) rotate(2deg); }
  50% { transform: translate(-4px, -14px) rotate(-1deg); }
  75% { transform: translate(-8px, -6px) rotate(1deg); }
}
`

export default function NotFound() {
  return (
    <>
      <style>{floatKeyframes}</style>
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-body)' }}
      >
        {/* Decorative background circles */}
        <div
          className="absolute rounded-full opacity-5"
          style={{
            width: 400,
            height: 400,
            background: 'var(--brand-main)',
            top: '-10%',
            right: '-5%',
            animation: 'pulse-ring 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full opacity-5"
          style={{
            width: 300,
            height: 300,
            background: 'var(--brand-accent)',
            bottom: '-8%',
            left: '-5%',
            animation: 'pulse-ring 8s ease-in-out infinite 1s',
          }}
        />

        <div
          className="text-center max-w-lg relative z-10"
          style={{ animation: 'fadeInUp 0.6s ease-out both' }}
        >
          {/* Illustration: layered icons */}
          <div className="relative mx-auto mb-6" style={{ width: 160, height: 160 }}>
            {/* Pulse ring behind */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: '2px solid var(--brand-main)',
                opacity: 0.15,
                animation: 'pulse-ring 3s ease-in-out infinite',
              }}
            />
            {/* Floating icon cluster */}
            <div style={{ animation: 'float 4s ease-in-out infinite' }}>
              <FileQuestion
                size={96}
                strokeWidth={1}
                className="mx-auto"
                style={{ color: 'var(--brand-main)' }}
              />
            </div>
            {/* Orbiting small icons */}
            <div
              className="absolute"
              style={{
                top: 10,
                right: 20,
                animation: 'drift 5s ease-in-out infinite',
                color: 'var(--brand-accent)',
              }}
            >
              <Search size={20} />
            </div>
            <div
              className="absolute"
              style={{
                bottom: 20,
                left: 10,
                animation: 'drift 6s ease-in-out infinite 1s',
                color: 'var(--text-muted)',
              }}
            >
              <MapPin size={18} />
            </div>
            <div
              className="absolute"
              style={{
                top: 30,
                left: 5,
                animation: 'drift 7s ease-in-out infinite 0.5s',
                color: 'var(--text-muted)',
              }}
            >
              <Compass size={16} />
            </div>
          </div>

          {/* Error code */}
          <h1
            className="text-8xl font-extrabold tracking-tight"
            style={{
              color: 'var(--brand-main)',
              animation: 'fadeInUp 0.6s ease-out 0.1s both',
            }}
          >
            404
          </h1>

          <h2
            className="text-2xl font-bold mt-3"
            style={{
              color: 'var(--text-primary)',
              animation: 'fadeInUp 0.6s ease-out 0.2s both',
            }}
          >
            页面未找到
          </h2>

          <p
            className="mt-3 text-base leading-relaxed"
            style={{
              color: 'var(--text-secondary)',
              animation: 'fadeInUp 0.6s ease-out 0.3s both',
            }}
          >
            您访问的页面不存在或已被移除，请检查地址是否正确
          </p>

          {/* Quick actions */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 mt-8"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
          >
            <Link to="/">
              <Button variant="primary" size="lg" icon={<Home size={16} />}>
                返回首页
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              icon={<ArrowLeft size={16} />}
              onClick={() => window.history.back()}
            >
              返回上页
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon={<RefreshCw size={16} />}
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          </div>

          {/* Divider */}
          <div
            className="mx-auto mt-10 mb-6"
            style={{
              width: 60,
              height: 1,
              background: 'var(--border-color)',
              animation: 'fadeInUp 0.6s ease-out 0.5s both',
            }}
          />

          {/* Help section */}
          <div
            className="rounded-xl p-5 mx-auto max-w-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              animation: 'fadeInUp 0.6s ease-out 0.55s both',
            }}
          >
            <p
              className="text-sm font-medium mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              需要帮助？
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:admin@aigate.dev"
                className="flex items-center gap-2 text-sm hover:underline transition-colors"
                style={{ color: 'var(--brand-main)' }}
              >
                <Mail size={14} />
                联系系统管理员
              </a>
              <a
                href="/docs"
                className="flex items-center gap-2 text-sm hover:underline transition-colors"
                style={{ color: 'var(--brand-main)' }}
              >
                <BookOpen size={14} />
                查看帮助文档
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
