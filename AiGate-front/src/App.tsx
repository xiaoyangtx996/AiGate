import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'

// Lazy-loaded pages - each becomes its own chunk
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const MyWorkspace = lazy(() => import('@/pages/MyWorkspace'))
const Organization = lazy(() => import('@/pages/Organization'))
const Users = lazy(() => import('@/pages/Users'))
const Keys = lazy(() => import('@/pages/Keys'))
const Logs = lazy(() => import('@/pages/Logs'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Knowledge = lazy(() => import('@/pages/Knowledge'))
const KnowledgeDetail = lazy(() => import('@/pages/KnowledgeDetail'))
const Mcp = lazy(() => import('@/pages/Mcp'))
const McpDetail = lazy(() => import('@/pages/McpDetail'))
const Agent = lazy(() => import('@/pages/Agent'))
const AgentCreate = lazy(() => import('@/pages/AgentCreate'))
const AgentChat = lazy(() => import('@/pages/AgentChat'))
const Prompts = lazy(() => import('@/pages/Prompts'))
const PromptDetail = lazy(() => import('@/pages/PromptDetail'))
const Skills = lazy(() => import('@/pages/Skills'))
const Plugins = lazy(() => import('@/pages/Plugins'))
const Hooks = lazy(() => import('@/pages/Hooks'))
const Settings = lazy(() => import('@/pages/Settings'))
const Channels = lazy(() => import('@/pages/Channels'))
const Models = lazy(() => import('@/pages/Models'))
const Billing = lazy(() => import('@/pages/Billing'))
const Subscription = lazy(() => import('@/pages/Subscription'))
const QuotaApproval = lazy(() => import('@/pages/QuotaApproval'))
const Audit = lazy(() => import('@/pages/Audit'))
const Status = lazy(() => import('@/pages/Status'))
const Developer = lazy(() => import('@/pages/Developer'))
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const Profile = lazy(() => import('@/pages/Profile'))
const DesignSystem = lazy(() => import('@/pages/DesignSystem'))
const NotFound = lazy(() => import('@/pages/errors/NotFound'))
const Forbidden = lazy(() => import('@/pages/errors/Forbidden'))
const ServerError = lazy(() => import('@/pages/errors/ServerError'))

function PageLoading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--brand-main)] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[var(--text-secondary)]">Loading...</span>
      </div>
    </div>
  )
}

function App() {
  const { theme } = useThemeStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/500" element={<ServerError />} />

        <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="workspace" element={<MyWorkspace />} />
          <Route path="organization" element={<Organization />} />
          <Route path="users" element={<Users />} />
          <Route path="keys" element={<Keys />} />
          <Route path="logs" element={<Logs />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="knowledge/:id" element={<KnowledgeDetail />} />
          <Route path="mcp" element={<Mcp />} />
          <Route path="mcp/:id" element={<McpDetail />} />
          <Route path="agent" element={<Agent />} />
          <Route path="agent/create" element={<AgentCreate />} />
          <Route path="agent/:id/chat" element={<AgentChat />} />
          <Route path="prompts" element={<Prompts />} />
          <Route path="prompts/:id" element={<PromptDetail />} />
          <Route path="skills" element={<Skills />} />
          <Route path="plugins" element={<Plugins />} />
          <Route path="hooks" element={<Hooks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="channels" element={<Channels />} />
          <Route path="models" element={<Models />} />
          <Route path="billing" element={<Billing />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="quota-approval" element={<QuotaApproval />} />
          <Route path="audit" element={<Audit />} />
          <Route path="status" element={<Status />} />
          <Route path="developer" element={<Developer />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="profile" element={<Profile />} />
          <Route path="design-system" element={<DesignSystem />} />
        </Route>

        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
