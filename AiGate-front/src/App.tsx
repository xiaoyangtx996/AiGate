import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import MyWorkspace from '@/pages/MyWorkspace'
import Organization from '@/pages/Organization'
import Users from '@/pages/Users'
import Keys from '@/pages/Keys'
import Logs from '@/pages/Logs'
import Alerts from '@/pages/Alerts'
import Knowledge from '@/pages/Knowledge'
import KnowledgeDetail from '@/pages/KnowledgeDetail'
import Mcp from '@/pages/Mcp'
import McpDetail from '@/pages/McpDetail'
import Agent from '@/pages/Agent'
import AgentCreate from '@/pages/AgentCreate'
import AgentChat from '@/pages/AgentChat'
import Prompts from '@/pages/Prompts'
import PromptDetail from '@/pages/PromptDetail'
import Skills from '@/pages/Skills'
import Plugins from '@/pages/Plugins'
import Hooks from '@/pages/Hooks'
import Settings from '@/pages/Settings'
import Channels from '@/pages/Channels'
import Models from '@/pages/Models'
import Billing from '@/pages/Billing'
import Subscription from '@/pages/Subscription'
import QuotaApproval from '@/pages/QuotaApproval'
import Audit from '@/pages/Audit'
import Status from '@/pages/Status'
import Developer from '@/pages/Developer'
import Onboarding from '@/pages/Onboarding'
import Profile from '@/pages/Profile'
import NotFound from '@/pages/errors/NotFound'
import Forbidden from '@/pages/errors/Forbidden'
import ServerError from '@/pages/errors/ServerError'

function App() {
  const { theme } = useThemeStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  return (
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
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

export default App
