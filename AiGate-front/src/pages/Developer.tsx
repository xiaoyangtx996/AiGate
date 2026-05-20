import { useState } from 'react'
import {
  Code2,
  Key,
  Copy,
  Check,
  BookOpen,
  Terminal,
  Puzzle,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  Globe,
  MessageSquare,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_BASE_URL = 'https://api.aigate.company.com/v1'

const TABS = [
  { id: 'guide', label: '接入指南', icon: <BookOpen size={14} /> },
  { id: 'api', label: 'API 文档', icon: <Code2 size={14} /> },
  { id: 'sdk', label: 'SDK 示例', icon: <Terminal size={14} /> },
  { id: 'faq', label: '常见问题', icon: <MessageSquare size={14} /> },
]

/* ------------------------------------------------------------------ */
/*  Code Snippets                                                      */
/* ------------------------------------------------------------------ */

const CODE_SNIPPETS = {
  python: {
    label: 'Python',
    lang: 'python',
    code: `from openai import OpenAI

client = OpenAI(
    api_key="ag-prod-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    base_url="${API_BASE_URL}"
)

# Chat Completion
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "解释量子计算的基本原理"}
    ],
    temperature=0.7,
    max_tokens=1024
)

print(response.choices[0].message.content)`,
  },
  node: {
    label: 'Node.js',
    lang: 'javascript',
    code: `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'ag-prod-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  baseURL: '${API_BASE_URL}',
});

// Chat Completion
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: '解释量子计算的基本原理' },
  ],
  temperature: 0.7,
  max_tokens: 1024,
});

console.log(response.choices[0].message.content);`,
  },
  curl: {
    label: 'cURL',
    lang: 'bash',
    code: `curl ${API_BASE_URL}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ag-prod-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "解释量子计算的基本原理"}
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'`,
  },
  java: {
    label: 'Java',
    lang: 'java',
    code: `// 使用 OkHttp 调用 AiGate 网关
OkHttpClient client = new OkHttpClient();

MediaType mediaType = MediaType.parse("application/json");
String body = """
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "解释量子计算的基本原理"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}""";

Request request = new Request.Builder()
    .url("${API_BASE_URL}/chat/completions")
    .header("Authorization", "Bearer ag-prod-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
    .post(RequestBody.create(body, mediaType))
    .build();

Response response = client.newCall(request).execute();
System.out.println(response.body().string());`,
  },
}

/* ------------------------------------------------------------------ */
/*  API Endpoints                                                      */
/* ------------------------------------------------------------------ */

const API_ENDPOINTS = [
  {
    method: 'POST',
    path: '/chat/completions',
    description: '对话补全（Chat Completion）',
    tag: '核心',
    tagVariant: 'success' as const,
  },
  {
    method: 'POST',
    path: '/completions',
    description: '文本补全（Legacy）',
    tag: '核心',
    tagVariant: 'success' as const,
  },
  {
    method: 'POST',
    path: '/embeddings',
    description: '向量嵌入（Embeddings）',
    tag: '核心',
    tagVariant: 'success' as const,
  },
  {
    method: 'GET',
    path: '/models',
    description: '列出可用模型',
    tag: '查询',
    tagVariant: 'info' as const,
  },
  {
    method: 'POST',
    path: '/images/generations',
    description: '图片生成（DALL-E）',
    tag: '扩展',
    tagVariant: 'warning' as const,
  },
  {
    method: 'POST',
    path: '/audio/transcriptions',
    description: '语音转文字（Whisper）',
    tag: '扩展',
    tagVariant: 'warning' as const,
  },
]

/* ------------------------------------------------------------------ */
/*  Tutorials                                                          */
/* ------------------------------------------------------------------ */

const TUTORIALS = [
  {
    id: 'cursor',
    icon: <Code2 size={20} />,
    title: 'Cursor IDE',
    subtitle: 'AI 编程助手',
    steps: [
      { label: '打开 Cursor Settings', detail: '快捷键 Ctrl+, 或点击左下角齿轮图标' },
      { label: '进入 Models 设置', detail: '导航至 Settings > Models > OpenAI API Key' },
      { label: '配置 API URL', detail: `将 API Base URL 设置为 ${API_BASE_URL}` },
      { label: '填写 API Key', detail: '在 API Key 输入框中粘贴你的 ag-key' },
      { label: '验证连接', detail: '点击 "Verify" 按钮，确认显示绿色对勾' },
    ],
  },
  {
    id: 'cherry',
    icon: <Puzzle size={20} />,
    title: 'Cherry Studio',
    subtitle: '多模型客户端',
    steps: [
      { label: '打开 Cherry Studio', detail: '启动应用，进入主界面' },
      { label: '进入设置', detail: '点击右上角设置图标，选择 "模型配置"' },
      { label: '添加自定义 Provider', detail: '点击 "添加 Provider"，选择 OpenAI Compatible' },
      { label: '填写网关信息', detail: `Base URL: ${API_BASE_URL}，API Key: 你的 ag-key` },
      { label: '选择模型', detail: '在模型列表中选择已授权的模型（如 gpt-4o）' },
    ],
  },
  {
    id: 'sdk',
    icon: <Terminal size={20} />,
    title: 'OpenAI SDK',
    subtitle: 'Python / Node.js',
    steps: [
      { label: '安装 SDK', detail: 'pip install openai 或 npm install openai' },
      { label: '初始化客户端', detail: '创建 OpenAI 实例，设置 api_key 和 base_url' },
      { label: '发起调用', detail: '使用标准 OpenAI API 方法（chat.completions.create 等）' },
      { label: '处理响应', detail: '响应格式与 OpenAI 官方完全一致，无需额外适配' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ Data                                                           */
/* ------------------------------------------------------------------ */

const FAQ_ITEMS = [
  {
    q: 'ag-key 和 OpenAI API Key 有什么区别？',
    a: 'ag-key 是 AiGate 网关的企业专属密钥，格式为 ag-{env}-{hex}。它兼容 OpenAI API 格式，但经过企业网关代理，支持配额管理、模型授权、IP 白名单、调用审计等企业级功能。你可以在 "密钥管理" 页面创建和管理你的 ag-key。',
  },
  {
    q: '如何获取我的 ag-key？',
    a: '登录 AiGate 平台后，进入 "网关接入 > 密钥管理" 页面，点击 "生成新密钥" 按钮。选择用途、环境（DEV/PROD）和有效期后即可生成。密钥仅在创建时显示一次，请务必妥善保管。',
  },
  {
    q: '支持哪些 AI 模型？',
    a: 'AiGate 网关支持 OpenAI 全系列（GPT-4o、GPT-4-Turbo 等）、Anthropic Claude 系列、Google Gemini 系列、DeepSeek 系列等主流模型。具体可用模型取决于管理员为你的密钥授权的范围，可在密钥详情中查看。',
  },
  {
    q: '调用频率和配额限制是多少？',
    a: '配额由管理员在组织层面分配。普通员工默认每日调用上限为 10,000 次，具体取决于你的部门配额。可在 "我的工作台 > 我的用量" 中查看实时配额使用情况。超额需提交配额申请。',
  },
  {
    q: '为什么我的请求返回 401 Unauthorized？',
    a: '常见原因：1) ag-key 已过期或被吊销；2) API Key 格式错误（需完整复制，包含 ag- 前缀）；3) 请求未携带 Authorization 头；4) IP 不在白名单范围内。请检查密钥状态和配置。',
  },
  {
    q: '为什么我的请求返回 429 Too Many Requests？',
    a: '表示你的调用频率超过了密钥或组织的速率限制。建议：1) 实现指数退避重试策略；2) 申请提升配额；3) 优化调用逻辑，减少无效请求。',
  },
  {
    q: '是否支持流式响应（Streaming）？',
    a: '是的。AiGate 网关完全兼容 OpenAI 的 SSE 流式响应格式。在请求中设置 stream: true 即可启用。流式响应适用于实时对话场景，可显著提升用户体验。',
  },
  {
    q: '调用日志保留多久？',
    a: '调用日志保留 180 天，操作审计日志保留 365 天。你可以在 "调用日志" 页面查看详细的调用记录，包括请求/响应内容、耗时、Token 用量等。',
  },
]

/* ------------------------------------------------------------------ */
/*  Sub-Components                                                     */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      className="text-xs font-bold hover:underline flex items-center gap-1 transition-colors"
      style={{ color: 'var(--brand-main)' }}
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check size={12} /> 已复制
        </>
      ) : (
        <>
          <Copy size={12} /> 复制
        </>
      )}
    </button>
  )
}

function CodeBlock({
  code,
  lang,
  className,
}: {
  code: string
  lang: string
  className?: string
}) {
  return (
    <div className={`relative group ${className ?? ''}`}>
      <pre
        className="p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <code>
          <span
            className="text-xs font-bold uppercase tracking-wider mb-2 block"
            style={{ color: 'var(--brand-main)' }}
          >
            {lang}
          </span>
          {code}
        </code>
      </pre>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  )
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/20 text-blue-400',
    POST: 'bg-green-500/20 text-green-400',
    PUT: 'bg-yellow-500/20 text-yellow-400',
    DELETE: 'bg-red-500/20 text-red-400',
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${colors[method] || colors.GET}`}
    >
      {method}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab Panels                                                         */
/* ------------------------------------------------------------------ */

function GuidePanel() {
  const [expandedTutorial, setExpandedTutorial] = useState<string | null>('cursor')

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-main)', opacity: 0.15 }}
            >
              <Zap size={20} style={{ color: 'var(--brand-main)' }} />
            </div>
            <div>
              <div className="font-bold text-sm">快速接入</div>
              <div className="text-xs text-secondary">3 分钟完成配置</div>
            </div>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            AiGate 兼容 OpenAI API 格式，只需修改 base_url 和 api_key 即可接入现有应用。
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-accent)', opacity: 0.15 }}
            >
              <Shield size={20} style={{ color: 'var(--brand-accent)' }} />
            </div>
            <div>
              <div className="font-bold text-sm">企业级安全</div>
              <div className="text-xs text-secondary">IP 白名单 / 密钥隔离</div>
            </div>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            每个 ag-key 支持 IP 白名单、模型授权、每日调用上限，确保调用安全可控。
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-main)', opacity: 0.15 }}
            >
              <Globe size={20} style={{ color: 'var(--brand-main)' }} />
            </div>
            <div>
              <div className="font-bold text-sm">多模型支持</div>
              <div className="text-xs text-secondary">GPT / Claude / Gemini</div>
            </div>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            统一接口访问 OpenAI、Anthropic、Google、DeepSeek 等主流模型，无需适配不同 SDK。
          </p>
        </Card>
      </div>

      {/* Gateway URL */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-secondary mb-1">网关接入地址（Base URL）</div>
            <div className="font-mono text-sm font-bold" style={{ color: 'var(--brand-main)' }}>
              {API_BASE_URL}
            </div>
          </div>
          <CopyButton text={API_BASE_URL} />
        </div>
      </Card>

      {/* Step-by-step Tutorials */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">分步接入教程</h3>
        {TUTORIALS.map((tutorial) => {
          const isExpanded = expandedTutorial === tutorial.id
          return (
            <Card key={tutorial.id} className="overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between text-left"
                onClick={() => setExpandedTutorial(isExpanded ? null : tutorial.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <span style={{ color: 'var(--brand-main)' }}>{tutorial.icon}</span>
                  </div>
                  <div>
                    <div className="font-bold">{tutorial.title}</div>
                    <div className="text-xs text-secondary">{tutorial.subtitle}</div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown size={18} className="text-secondary" />
                ) : (
                  <ChevronRight size={18} className="text-secondary" />
                )}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="pt-4 space-y-4">
                    {tutorial.steps.map((step, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              backgroundColor: 'var(--brand-main)',
                              color: 'var(--text-on-brand)',
                            }}
                          >
                            {index + 1}
                          </div>
                          {index < tutorial.steps.length - 1 && (
                            <div
                              className="w-0.5 flex-1 mt-1"
                              style={{ backgroundColor: 'var(--border-color)' }}
                            />
                          )}
                        </div>
                        <div className="pb-4">
                          <div className="font-bold text-sm">{step.label}</div>
                          <div className="text-xs text-secondary mt-1 leading-relaxed">
                            {step.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Key CTA */}
      <Card
        className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))',
          border: '1px solid var(--brand-main)',
        }}
      >
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Key size={18} style={{ color: 'var(--brand-main)' }} />
            还没有密钥？
          </h3>
          <p className="text-sm text-secondary mt-1">
            前往密钥管理页面创建你的专属 ag-key，即可开始调用。
          </p>
        </div>
        <a
          href="#/keys"
          className="btn-primary text-sm py-2 px-6 whitespace-nowrap"
        >
          创建 &amp; 管理 Key
        </a>
      </Card>
    </div>
  )
}

function ApiPanel() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-main)', opacity: 0.15 }}
          >
            <Code2 size={16} style={{ color: 'var(--brand-main)' }} />
          </div>
          <div>
            <div className="font-bold text-sm">OpenAI 兼容接口</div>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              AiGate 网关完全兼容 OpenAI REST API 规范。你可以使用标准的 OpenAI SDK（Python / Node.js / Go
              / Java）或直接发起 HTTP 请求。所有端点均以
              <code
                className="mx-1 px-1.5 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                {API_BASE_URL}
              </code>
              为前缀。
            </p>
          </div>
        </div>
      </Card>

      {/* Endpoints Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-bold">API 端点列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead
              className="border-b"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
            >
              <tr>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                  方法
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                  端点
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">
                  说明
                </th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">
                  分类
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {API_ENDPOINTS.map((ep) => (
                <tr
                  key={ep.path}
                  className="border-b transition-colors hover:bg-elevated"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <td className="p-4">
                    <MethodBadge method={ep.method} />
                  </td>
                  <td className="p-4 font-mono text-xs">{ep.path}</td>
                  <td className="p-4">{ep.description}</td>
                  <td className="p-4 text-right">
                    <Badge variant={ep.tagVariant}>{ep.tag}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Request / Response Example */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--brand-main)', color: 'var(--text-on-brand)' }}
            >
              R
            </span>
            请求示例
          </h4>
          <CodeBlock
            lang="HTTP"
            code={`POST ${API_BASE_URL}/chat/completions
Content-Type: application/json
Authorization: Bearer ag-prod-xxxx

{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}`}
          />
        </Card>
        <Card className="p-4">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--brand-accent)', color: 'var(--text-on-brand)' }}
            >
              S
            </span>
            响应示例
          </h4>
          <CodeBlock
            lang="JSON"
            code={`{
  "id": "chatcmpl-aigate-xxx",
  "object": "chat.completion",
  "model": "gpt-4o",
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 48,
    "total_tokens": 60
  },
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help?"
      },
      "finish_reason": "stop"
    }
  ]
}`}
          />
        </Card>
      </div>

      {/* Auth Info */}
      <Card className="p-4">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Shield size={16} style={{ color: 'var(--brand-accent)' }} />
          认证方式
        </h4>
        <div className="space-y-3 text-sm text-secondary">
          <p>
            所有 API 请求必须在 <code className="px-1 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>Authorization</code> 头中携带你的
            ag-key：
          </p>
          <CodeBlock
            lang="Header"
            code={'Authorization: Bearer ag-{env}-{hex}'}
          />
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>密钥格式：<code className="px-1 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)' }}>ag-{'{env}'}-{'{hex}'}</code>，其中 env 为 prod 或 dev</li>
            <li>Bearer 与密钥之间需有空格</li>
            <li>密钥区分大小写，请完整复制</li>
            <li>如果密钥配置了 IP 白名单，仅白名单内的 IP 可访问</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

function SdkPanel() {
  const [activeLang, setActiveLang] = useState('python')
  const snippet = CODE_SNIPPETS[activeLang as keyof typeof CODE_SNIPPETS]

  return (
    <div className="space-y-6">
      {/* Language Tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CODE_SNIPPETS).map(([key, value]) => (
          <button
            key={key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeLang === key
                ? 'text-white'
                : 'text-secondary hover:text-primary'
            }`}
            style={{
              backgroundColor: activeLang === key ? 'var(--brand-main)' : 'var(--bg-elevated)',
            }}
            onClick={() => setActiveLang(key)}
          >
            {value.label}
          </button>
        ))}
      </div>

      {/* Code Block */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">{snippet.label} 完整示例</h3>
            <CopyButton text={snippet.code} />
          </div>
        </div>
        <div className="p-4">
          <CodeBlock lang={snippet.lang} code={snippet.code} />
        </div>
      </Card>

      {/* Streaming Example */}
      <Card className="p-4">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Zap size={16} style={{ color: 'var(--brand-accent)' }} />
          流式响应（Streaming）
        </h3>
        <p className="text-xs text-secondary mb-3">
          对于实时对话场景，建议使用流式响应以提升用户体验。设置
          <code className="mx-1 px-1 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)' }}>stream: true</code>
          即可启用。
        </p>
        <CodeBlock
          lang="python"
          code={`from openai import OpenAI

client = OpenAI(
    api_key="ag-prod-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    base_url="${API_BASE_URL}"
)

stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "写一首关于春天的诗"}],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`}
        />
      </Card>

      {/* Error Handling */}
      <Card className="p-4">
        <h3 className="font-bold text-sm mb-3">错误处理最佳实践</h3>
        <CodeBlock
          lang="python"
          code={`from openai import OpenAI, APIError, RateLimitError, AuthenticationError

client = OpenAI(
    api_key="ag-prod-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    base_url="${API_BASE_URL}"
)

try:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello"}],
    )
except AuthenticationError:
    print("认证失败：请检查 ag-key 是否有效")
except RateLimitError:
    print("速率限制：请求过于频繁，请稍后重试")
except APIError as e:
    print(f"API 错误：{e.status_code} - {e.message}")`}
        />
      </Card>
    </div>
  )
}

function FaqPanel() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-accent)', opacity: 0.15 }}
          >
            <MessageSquare size={16} style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div>
            <div className="font-bold text-sm">需要更多帮助？</div>
            <p className="text-xs text-secondary mt-1">
              如果以下常见问题无法解答你的疑问，请联系企业 IT 管理员或在内部协作平台提交工单。
            </p>
          </div>
        </div>
      </Card>

      {FAQ_ITEMS.map((faq, index) => {
        const isExpanded = expandedFaq === index
        return (
          <Card key={index} className="overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between text-left gap-4"
              onClick={() => setExpandedFaq(isExpanded ? null : index)}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: isExpanded ? 'var(--brand-main)' : 'var(--bg-elevated)',
                    color: isExpanded ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {index + 1}
                </span>
                <span className="font-bold text-sm">{faq.q}</span>
              </div>
              {isExpanded ? (
                <ChevronDown size={16} className="text-secondary flex-shrink-0" />
              ) : (
                <ChevronRight size={16} className="text-secondary flex-shrink-0" />
              )}
            </button>
            {isExpanded && (
              <div
                className="px-4 pb-4 border-t"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <p className="text-sm text-secondary leading-relaxed pt-4 pl-9">
                  {faq.a}
                </p>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Developer() {
  const [activeTab, setActiveTab] = useState('guide')

  const renderPanel = () => {
    switch (activeTab) {
      case 'guide':
        return <GuidePanel />
      case 'api':
        return <ApiPanel />
      case 'sdk':
        return <SdkPanel />
      case 'faq':
        return <FaqPanel />
      default:
        return <GuidePanel />
    }
  }

  return (
    <div>
      <PageHeader
        title="开发者中心"
        subtitle="了解如何将你的企业专属 ag-key 配置到各种主流客户端、IDE 插件或直接发起 HTTP 调用。"
        breadcrumbs={[{ label: '系统' }, { label: '开发者中心' }]}
        actions={
          <a
            href="#/keys"
            className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
          >
            <Key size={14} />
            管理密钥
          </a>
        }
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {renderPanel()}
    </div>
  )
}
