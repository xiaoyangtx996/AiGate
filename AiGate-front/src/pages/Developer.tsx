import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Code2, Key, Copy, Check } from 'lucide-react'

const API_BASE_URL = 'https://api.aigate.company.com/v1'

const pythonCode = `from openai import OpenAI

client = OpenAI(
    api_key="your-ag-key-here",
    base_url="https://api.aigate.company.com/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello, world!"}]
)`

export default function Developer() {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  return (
    <div>
      <PageHeader
        title="开发者中心"
        subtitle="了解如何将你的企业专属 ag-key 配置到各种主流客户端、IDE 插件或直接发起 HTTP 调用。"
        breadcrumbs={[{ label: '系统' }, { label: '开发者中心' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Integration Tutorials */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Code2 size={18} />
              快速集成教程
            </h3>

            <div className="space-y-6">
              {/* Tutorial 1: Cursor IDE */}
              <div>
                <h4 className="font-bold text-sm text-brand-main">
                  1. 在 Cursor IDE 中使用
                </h4>
                <p className="text-xs text-secondary mt-1">
                  打开 Settings -&gt; Models -&gt; OpenAI API，将 API URL
                  设置为：
                </p>
                <div className="bg-black/20 dark:bg-white/5 p-3 rounded-lg font-mono text-xs text-secondary mt-2 flex justify-between items-center">
                  <span>{API_BASE_URL}</span>
                  <button
                    className="text-xs text-brand-main font-bold hover:underline flex items-center gap-1"
                    onClick={() => handleCopy(API_BASE_URL, setCopiedUrl)}
                  >
                    {copiedUrl ? (
                      <>
                        <Check size={12} /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> 复制
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-secondary mt-2">
                  在 API Key 输入框中填写你的专属
                  ag-key（可在"我的密钥"中创建并获取）。
                </p>
              </div>

              {/* Tutorial 2: Python SDK */}
              <div>
                <h4 className="font-bold text-sm text-brand-main">
                  2. 使用 OpenAI Python SDK 发起调用
                </h4>
                <p className="text-xs text-secondary mt-1">
                  直接将 OpenAI SDK 的 client base_url
                  指向企业网关即可，无需修改任何调用逻辑：
                </p>
                <div className="relative mt-2">
                  <pre className="bg-black/20 dark:bg-white/5 p-3 rounded-lg font-mono text-xs text-secondary overflow-x-auto">
                    <code>{pythonCode}</code>
                  </pre>
                  <button
                    className="absolute top-3 right-3 text-xs text-brand-main font-bold hover:underline flex items-center gap-1"
                    onClick={() => handleCopy(pythonCode, setCopiedCode)}
                  >
                    {copiedCode ? (
                      <>
                        <Check size={12} /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> 复制
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Get Key CTA */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Key size={18} />
              获取你的专属 Key
            </h3>
            <p className="text-xs text-secondary mt-2">
              只有在拥有专属密钥时你才能成功发起上述调用，你可以立刻去申请或创建专属
              Key。
            </p>
          </div>
          <a
            href="#/keys"
            className="btn-primary w-full text-center text-sm py-2 mt-4"
          >
            创建 &amp; 管理 Key
          </a>
        </Card>
      </div>
    </div>
  )
}
