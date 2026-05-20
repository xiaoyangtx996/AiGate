# AiGate Frontend Phase 1: Foundation & Core Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the React + TypeScript + Vite + Tailwind v4 project with design system, theme switching, routing, and core layout components.

**Architecture:** Single-page application using React 18 with TypeScript, Vite for build, Tailwind CSS v4 for styling with CSS variables for three-theme system (dark/light/apple). State management via Zustand, server state via TanStack Query, routing via React Router v6.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query, React Router v6, Lucide React, ECharts 5, React Hook Form, Zod

---

## File Structure

```
web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                    # Tailwind + CSS variables + base styles
│   ├── vite-env.d.ts
│   │
│   ├── styles/
│   │   ├── themes.css               # Three theme definitions (dark/light/apple)
│   │   ├── components.css           # Shared component styles
│   │   └── utilities.css            # Custom utility classes
│   │
│   ├── stores/
│   │   ├── theme.ts                 # Theme store (Zustand)
│   │   ├── auth.ts                  # Auth store (user, role, tenant)
│   │   └── ui.ts                    # UI store (sidebar, modals, toasts)
│   │
│   ├── hooks/
│   │   ├── useTheme.ts              # Theme hook
│   │   ├── useAuth.ts               # Auth hook
│   │   └── useRole.ts               # Role-based visibility hook
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MasterNav.tsx        # Top navigation bar (glassmorphism)
│   │   │   ├── Sidebar.tsx          # Left sidebar navigation
│   │   │   ├── MainLayout.tsx       # Layout wrapper
│   │   │   ├── PageHeader.tsx       # Page header with breadcrumbs
│   │   │   └── Breadcrumb.tsx       # Breadcrumb component
│   │   │
│   │   ├── ui/
│   │   │   ├── Button.tsx           # Button variants
│   │   │   ├── Card.tsx             # Card component
│   │   │   ├── Badge.tsx            # Status badges
│   │   │   ├── Input.tsx            # Input component
│   │   │   ├── Select.tsx           # Select component
│   │   │   ├── Modal.tsx            # Modal dialog
│   │   │   ├── Drawer.tsx           # Side drawer
│   │   │   ├── Toast.tsx            # Toast notifications
│   │   │   ├── Skeleton.tsx         # Loading skeleton
│   │   │   ├── EmptyState.tsx       # Empty state placeholder
│   │   │   ├── Tabs.tsx             # Tab navigation
│   │   │   └── Tooltip.tsx          # Tooltip component
│   │   │
│   │   ├── data/
│   │   │   ├── DataTable.tsx        # Full-featured data table
│   │   │   ├── Pagination.tsx       # Pagination component
│   │   │   ├── SearchInput.tsx      # Search with keyboard shortcut
│   │   │   └── FilterBar.tsx        # Filter bar component
│   │   │
│   │   └── feedback/
│   │       ├── ConfirmDialog.tsx    # Confirmation dialog
│   │       ├── ErrorBoundary.tsx    # Error boundary
│   │       └── LoadingSpinner.tsx   # Loading spinner
│   │
│   ├── pages/
│   │   ├── Login.tsx                # Login page
│   │   ├── Dashboard.tsx            # Operations dashboard
│   │   ├── MyWorkspace.tsx          # Employee workspace
│   │   ├── Organization.tsx         # Organization & quota
│   │   ├── Users.tsx                # User management
│   │   ├── Keys.tsx                 # Key management
│   │   ├── Logs.tsx                 # Call logs
│   │   ├── Alerts.tsx               # Alert center
│   │   ├── Knowledge.tsx            # Knowledge base
│   │   ├── KnowledgeDetail.tsx      # Knowledge base detail
│   │   ├── Mcp.tsx                  # MCP marketplace
│   │   ├── McpDetail.tsx            # MCP detail
│   │   ├── Agent.tsx                # Agent center
│   │   ├── AgentCreate.tsx          # Agent creation wizard
│   │   ├── AgentChat.tsx            # Agent chat window
│   │   ├── Prompts.tsx              # Prompt library
│   │   ├── PromptDetail.tsx         # Prompt detail & debug
│   │   ├── Skills.tsx               # Skills marketplace
│   │   ├── Plugins.tsx              # Plugins marketplace
│   │   ├── Hooks.tsx                # Hooks library
│   │   ├── Settings.tsx             # System settings
│   │   ├── Channels.tsx             # Channel management
│   │   ├── Models.tsx               # Model assets
│   │   ├── Billing.tsx              # Usage reports
│   │   ├── Subscription.tsx         # Subscription & billing
│   │   ├── QuotaApproval.tsx        # Quota approval
│   │   ├── Audit.tsx                # Audit logs
│   │   ├── Status.tsx               # System status
│   │   ├── Developer.tsx            # Developer center
│   │   ├── Onboarding.tsx           # First-time onboarding
│   │   └── errors/
│   │       ├── NotFound.tsx         # 404 page
│   │       ├── Forbidden.tsx        # 403 page
│   │       └── ServerError.tsx      # 500 page
│   │
│   ├── lib/
│   │   ├── api.ts                   # API client (axios/fetch wrapper)
│   │   ├── utils.ts                 # Utility functions
│   │   ├── constants.ts             # Constants
│   │   └── validators.ts            # Zod schemas
│   │
│   └── types/
│       ├── index.ts                 # Shared types
│       ├── api.ts                   # API response types
│       └── models.ts                # Data model types
│
├── public/
│   └── favicon.ico
│
└── docs/
    └── components.md                # Component documentation
```

---

## Task 1: Initialize Vite + React + TypeScript Project

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/vite-env.d.ts`

- [ ] **Step 1: Create package.json with all dependencies**

```json
{
  "name": "aigate-web",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.4",
    "@tanstack/react-query": "^5.51.0",
    "lucide-react": "^0.424.0",
    "echarts": "^5.5.1",
    "echarts-for-react": "^3.0.2",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.8",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.16.0",
    "@typescript-eslint/parser": "^7.16.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="AiGate - Enterprise AI Gateway Management Platform" />
    <title>AiGate</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 8: Install dependencies and verify**

Run: `cd web && npm install`
Expected: Dependencies installed successfully

Run: `npm run dev`
Expected: Vite dev server starts on http://localhost:3000

- [ ] **Step 9: Commit**

```bash
git add web/
git commit -m "feat: initialize Vite + React + TypeScript project"
```

---

## Task 2: Setup Tailwind CSS v4 with Three-Theme System

**Files:**
- Create: `web/src/index.css`
- Create: `web/src/styles/themes.css`
- Create: `web/src/styles/components.css`

- [ ] **Step 1: Create src/index.css with Tailwind v4 and CSS variables**

```css
@import "tailwindcss";
@import "./styles/themes.css";
@import "./styles/components.css";

/* Base styles */
@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 14px;
    line-height: 1.6;
  }

  body {
    font-family: ui-sans-serif, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background-color: var(--bg-body);
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* Mono font for code/data */
  .font-mono {
    font-family: ui-monospace, "JetBrains Mono", Consolas, monospace;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }

  /* Selection */
  ::selection {
    background: var(--brand-main);
    color: white;
  }

  /* Focus visible */
  :focus-visible {
    outline: 2px solid var(--brand-main);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 2: Create src/styles/themes.css with three theme definitions**

```css
/* =================================-
   Theme Definitions
   =================================- */

/* Dark Theme (Default) */
.dark {
  --bg-body: #09090b;
  --bg-surface: #18181b;
  --bg-elevated: #27272a;
  --border-color: #27272a;
  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --brand-main: #10b981;
  --brand-main-hover: #34d399;
  --brand-accent: #f59e0b;
  --brand-accent-hover: #fbbf24;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #06b6d4;
  --border-radius-base: 0.75rem;
  --shadow-card: none;
  --shadow-dropdown: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  --backdrop-filter: none;
}

/* Light Theme */
.light {
  --bg-body: #ffffff;
  --bg-surface: #ffffff;
  --bg-elevated: #f4f4f5;
  --border-color: #111827;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --brand-main: #ea580c;
  --brand-main-hover: #f97316;
  --brand-accent: #059669;
  --brand-accent-hover: #10b981;
  --success: #059669;
  --warning: #d97706;
  --error: #dc2626;
  --info: #0891b2;
  --border-radius-base: 0px;
  --shadow-card: 4px 4px 0px #111;
  --shadow-dropdown: 4px 4px 0px #111;
  --backdrop-filter: none;
}

/* Apple Theme */
.apple {
  --bg-body: #f5f5f7;
  --bg-surface: rgba(255, 255, 255, 0.65);
  --bg-elevated: rgba(255, 255, 255, 0.8);
  --border-color: rgba(0, 0, 0, 0.05);
  --text-primary: #1d1d1f;
  --text-secondary: #86868b;
  --text-muted: #aeaeb2;
  --brand-main: #0066cc;
  --brand-main-hover: #0077ed;
  --brand-accent: #ff3b30;
  --brand-accent-hover: #ff6961;
  --success: #34c759;
  --warning: #ff9500;
  --error: #ff3b30;
  --info: #007aff;
  --border-radius-base: 1.125rem;
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.04);
  --shadow-dropdown: 0 10px 40px rgba(0, 0, 0, 0.12);
  --backdrop-filter: blur(20px) saturate(180%);
}
```

- [ ] **Step 3: Create src/styles/components.css with shared component styles**

```css
/* =================================-
   Shared Component Styles
   =================================- */

/* Card */
@layer components {
  .card {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-base);
    box-shadow: var(--shadow-card);
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .apple .card {
    backdrop-filter: var(--backdrop-filter);
    -webkit-backdrop-filter: var(--backdrop-filter);
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  .light .card {
    border-width: 2px;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: var(--border-radius-base);
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    outline: none;
  }

  .btn:focus-visible {
    outline: 2px solid var(--brand-main);
    outline-offset: 2px;
  }

  .btn-primary {
    background-color: var(--brand-main);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--brand-main-hover);
  }

  .btn-secondary {
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background-color: var(--bg-elevated);
  }

  .btn-danger {
    background-color: var(--error);
    color: white;
  }

  .btn-danger:hover {
    opacity: 0.9;
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 9999px;
  }

  .badge-success {
    background-color: var(--success);
    color: white;
  }

  .badge-warning {
    background-color: var(--warning);
    color: white;
  }

  .badge-error {
    background-color: var(--error);
    color: white;
  }

  .badge-neutral {
    background-color: var(--bg-elevated);
    color: var(--text-secondary);
  }

  /* Input */
  .input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-base);
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .input:focus {
    outline: none;
    border-color: var(--brand-main);
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  }

  .input::placeholder {
    color: var(--text-muted);
  }

  /* Navigation */
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--border-radius-base);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .nav-item:hover {
    background-color: var(--bg-elevated);
    color: var(--text-primary);
  }

  .nav-item.active {
    background-color: var(--brand-main);
    color: white;
  }

  /* Sidebar */
  .sidebar {
    width: 260px;
    height: 100%;
    background-color: var(--bg-surface);
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    padding: 1rem 0.75rem;
  }

  /* Master Nav (Top Bar) */
  .master-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    height: 64px;
    background-color: var(--bg-surface);
    border-bottom: 1px solid var(--border-color);
  }

  .apple .master-nav {
    backdrop-filter: var(--backdrop-filter);
    -webkit-backdrop-filter: var(--backdrop-filter);
    background-color: rgba(255, 255, 255, 0.7);
  }

  /* Toast */
  .toast {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    min-width: 300px;
    max-width: 500px;
    padding: 1rem;
    border-radius: var(--border-radius-base);
    box-shadow: var(--shadow-dropdown);
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-1rem);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .toast-success {
    background-color: var(--success);
    color: white;
  }

  .toast-warning {
    background-color: var(--warning);
    color: white;
  }

  .toast-error {
    background-color: var(--error);
    color: white;
  }

  .toast-info {
    background-color: var(--info);
    color: white;
  }

  /* Skeleton */
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--bg-elevated) 25%,
      var(--bg-surface) 50%,
      var(--bg-elevated) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--border-radius-base);
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
}
```

- [ ] **Step 4: Verify theme switching works**

Run: `cd web && npm run dev`
Expected: Dev server starts, styles are applied

- [ ] **Step 5: Commit**

```bash
git add web/src/index.css web/src/styles/
git commit -m "feat: setup Tailwind CSS v4 with three-theme system"
```

---

## Task 3: Create Zustand Stores (Theme, Auth, UI)

**Files:**
- Create: `web/src/stores/theme.ts`
- Create: `web/src/stores/auth.ts`
- Create: `web/src/stores/ui.ts`

- [ ] **Step 1: Create theme store**

```typescript
// web/src/stores/theme.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'apple'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        document.documentElement.className = theme
        set({ theme })
      },
    }),
    {
      name: 'aigate_theme',
    }
  )
)
```

- [ ] **Step 2: Create auth store**

```typescript
// web/src/stores/auth.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'sys_admin' | 'tenant_admin' | 'dept_lead' | 'project_lead' | 'user'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: Role
  tenantId: string
  tenantName: string
  department?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  // Role simulation (for demo)
  simulatedRole: Role | null
  setSimulatedRole: (role: Role | null) => void
  getEffectiveRole: () => Role
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      simulatedRole: null,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true })
        // Set initial theme from user preferences
        const themeStore = useThemeStore.getState()
        document.documentElement.className = themeStore.theme
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, simulatedRole: null })
      },

      updateUser: (updates) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } })
        }
      },

      setSimulatedRole: (role) => {
        set({ simulatedRole: role })
      },

      getEffectiveRole: () => {
        const { user, simulatedRole } = get()
        return simulatedRole || user?.role || 'user'
      },
    }),
    {
      name: 'aigate_auth',
    }
  )
)

// Import here to avoid circular dependency
import { useThemeStore } from './theme'
```

- [ ] **Step 3: Create UI store**

```typescript
// web/src/stores/ui.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Navigation groups
  expandedGroups: string[]
  toggleGroup: (group: string) => void

  // Modals & Drawers
  activeModal: string | null
  activeDrawer: string | null
  openModal: (id: string) => void
  closeModal: () => void
  openDrawer: (id: string) => void
  closeDrawer: () => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Search
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
}

export interface Toast {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message?: string
  duration?: number
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar
      sidebarCollapsed: false,
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Navigation groups
      expandedGroups: ['data-center', 'org-governance', 'gateway', 'assets', 'agent', 'monitoring'],
      toggleGroup: (group) => {
        const { expandedGroups } = get()
        if (expandedGroups.includes(group)) {
          set({ expandedGroups: expandedGroups.filter((g) => g !== group) })
        } else {
          set({ expandedGroups: [...expandedGroups, group] })
        }
      },

      // Modals & Drawers
      activeModal: null,
      activeDrawer: null,
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),
      openDrawer: (id) => set({ activeDrawer: id }),
      closeDrawer: () => set({ activeDrawer: null }),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast = { ...toast, id }
        set((state) => ({ toasts: [...state.toasts, newToast] }))

        // Auto remove after duration
        const duration = toast.duration || 3000
        setTimeout(() => {
          get().removeToast(id)
        }, duration)
      },
      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      },

      // Search
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: 'aigate_ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedGroups: state.expandedGroups,
      }),
    }
  )
)
```

- [ ] **Step 4: Commit**

```bash
git add web/src/stores/
git commit -m "feat: add Zustand stores for theme, auth, and UI state"
```

---

## Task 4: Create Custom Hooks

**Files:**
- Create: `web/src/hooks/useTheme.ts`
- Create: `web/src/hooks/useAuth.ts`
- Create: `web/src/hooks/useRole.ts`

- [ ] **Step 1: Create useTheme hook**

```typescript
// web/src/hooks/useTheme.ts
import { useEffect } from 'react'
import { useThemeStore, Theme } from '@/stores/theme'

export function useTheme() {
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  const cycleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'apple']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return { theme, setTheme, cycleTheme }
}
```

- [ ] **Step 2: Create useAuth hook**

```typescript
// web/src/hooks/useAuth.ts
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const store = useAuthStore()

  const hasRole = (roles: string | string[]) => {
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(store.getEffectiveRole())
  }

  const isSysAdmin = () => store.getEffectiveRole() === 'sys_admin'
  const isTenantAdmin = () => store.getEffectiveRole() === 'tenant_admin'
  const isDeptLead = () => store.getEffectiveRole() === 'dept_lead'
  const isProjectLead = () => store.getEffectiveRole() === 'project_lead'
  const isUser = () => store.getEffectiveRole() === 'user'

  return {
    ...store,
    hasRole,
    isSysAdmin,
    isTenantAdmin,
    isDeptLead,
    isProjectLead,
    isUser,
  }
}
```

- [ ] **Step 3: Create useRole hook for role-based visibility**

```typescript
// web/src/hooks/useRole.ts
import { useAuthStore, Role } from '@/stores/auth'

interface RoleVisibilityOptions {
  roles: Role[]
  fallback?: boolean
}

export function useRoleVisibility({ roles, fallback = false }: RoleVisibilityOptions) {
  const getEffectiveRole = useAuthStore((state) => state.getEffectiveRole)
  const currentRole = getEffectiveRole()

  const isVisible = roles.includes(currentRole)
  const isHidden = !isVisible

  return {
    isVisible,
    isHidden,
    currentRole,
    // Helper for conditional rendering
    show: isVisible ? true : fallback,
  }
}

// Utility function for DOM-based role filtering (backward compatibility)
export function applyRole() {
  const role = useAuthStore.getState().getEffectiveRole()

  document.querySelectorAll('[data-roles]').forEach((el) => {
    const allowedRoles = (el as HTMLElement).dataset.roles?.split(',') || []
    if (allowedRoles.includes(role)) {
      (el as HTMLElement).style.display = ''
    } else {
      (el as HTMLElement).style.display = 'none'
    }
  })

  // Handle view-*-only classes
  document.querySelectorAll('[class*="view-"]').forEach((el) => {
    const classes = (el as HTMLElement).className
    const match = classes.match(/view-(\w+)-only/)
    if (match) {
      const viewRole = match[1]
      if (viewRole === role || role === 'sys_admin') {
        (el as HTMLElement).style.display = ''
      } else {
        (el as HTMLElement).style.display = 'none'
      }
    }
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/hooks/
git commit -m "feat: add custom hooks for theme, auth, and role management"
```

---

## Task 5: Create Core UI Components

**Files:**
- Create: `web/src/components/ui/Button.tsx`
- Create: `web/src/components/ui/Card.tsx`
- Create: `web/src/components/ui/Badge.tsx`
- Create: `web/src/components/ui/Input.tsx`
- Create: `web/src/components/ui/Modal.tsx`
- Create: `web/src/components/ui/Drawer.tsx`
- Create: `web/src/components/ui/Toast.tsx`
- Create: `web/src/components/ui/Skeleton.tsx`
- Create: `web/src/components/ui/EmptyState.tsx`
- Create: `web/src/components/ui/Tabs.tsx`

- [ ] **Step 1: Create Button component**

```typescript
// web/src/components/ui/Button.tsx
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'btn',
          {
            'btn-primary': variant === 'primary',
            'btn-secondary': variant === 'secondary',
            'btn-danger': variant === 'danger',
            'btn-ghost': variant === 'ghost',
          },
          {
            'btn-sm': size === 'sm',
            'btn-md': size === 'md',
            'btn-lg': size === 'lg',
          },
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && icon && icon}
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create Card component**

```typescript
// web/src/components/ui/Card.tsx
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'card',
          hover && 'hover:border-brand-main cursor-pointer',
          onClick && 'cursor-pointer',
          className
        )
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={twMerge('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={twMerge('text-lg font-semibold', className)}>
      {children}
    </h3>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={twMerge('', className)}>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create Badge component**

```typescript
// web/src/components/ui/Badge.tsx
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'neutral', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'badge',
          {
            'badge-success': variant === 'success',
            'badge-warning': variant === 'warning',
            'badge-error': variant === 'error',
            'badge-info': variant === 'info',
            'badge-neutral': variant === 'neutral',
          },
          {
            'text-xs px-2 py-0.5': size === 'sm',
            'text-sm px-3 py-1': size === 'md',
          },
          className
        )
      )}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 4: Create Input component**

```typescript
// web/src/components/ui/Input.tsx
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={twMerge(
            clsx(
              'input',
              icon && 'pl-10',
              error && 'border-red-500 focus:border-red-500',
              className
            )
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-muted">{helperText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create Modal component**

```typescript
// web/src/components/ui/Modal.tsx
import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        ref={contentRef}
        className={twMerge(
          clsx(
            'card w-full max-h-[90vh] overflow-y-auto',
            {
              'max-w-sm': size === 'sm',
              'max-w-md': size === 'md',
              'max-w-lg': size === 'lg',
              'max-w-xl': size === 'xl',
            },
            className
          )
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="text-sm text-secondary mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create Drawer component**

```typescript
// web/src/components/ui/Drawer.tsx
import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = 'md',
  className,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        className={twMerge(
          clsx(
            'card h-full overflow-y-auto animate-slide-in-right',
            {
              'w-[480px]': width === 'sm',
              'w-[640px]': width === 'md',
              'w-[80vw]': width === 'lg',
            },
            className
          )
        )}
      >
        <div className="sticky top-0 bg-surface z-10 flex items-start justify-between pb-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="text-sm text-secondary mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create Toast component**

```typescript
// web/src/components/ui/Toast.tsx
import React from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { useUIStore, Toast as ToastType } from '@/stores/ui'

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: ToastType
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const Icon = icons[toast.type]

  return (
    <div className={`toast toast-${toast.type} flex items-start gap-3 min-w-[300px] max-w-[500px]`}>
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.message && (
          <p className="text-sm opacity-90 mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Create Skeleton component**

```typescript
// web/src/components/ui/Skeleton.tsx
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={twMerge(
              'skeleton h-4',
              i === lines - 1 && 'w-3/4',
              className
            )}
            style={{ width: i === lines - 1 ? '75%' : width }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={twMerge(
        'skeleton',
        {
          'h-4 w-full': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-lg': variant === 'rectangular',
        },
        className
      )}
      style={{ width, height }}
    />
  )
}

// Preset skeleton layouts
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" lines={3} />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Create EmptyState component**

```typescript
// web/src/components/ui/EmptyState.tsx
import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className || ''}`}>
      <Icon size={48} />
      <h3 className="text-lg font-medium mt-4">{title}</h3>
      {description && (
        <p className="text-sm mt-2 max-w-md">{description}</p>
      )}
      {action && (
        <Button
          variant="primary"
          size="md"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 10: Create Tabs component**

```typescript
// web/src/components/ui/Tabs.tsx
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface Tab {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={twMerge(
        'flex gap-1 p-1 bg-elevated rounded-lg',
        className
      )}
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
            activeTab === tab.id
              ? 'bg-surface text-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          )}
          style={{
            backgroundColor: activeTab === tab.id ? 'var(--bg-surface)' : undefined,
          }}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={clsx(
                'px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id
                  ? 'bg-brand-main text-white'
                  : 'bg-elevated text-secondary'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 11: Commit**

```bash
git add web/src/components/ui/
git commit -m "feat: add core UI components (Button, Card, Badge, Input, Modal, Drawer, Toast, Skeleton, EmptyState, Tabs)"
```

---

## Task 6: Create Layout Components

**Files:**
- Create: `web/src/components/layout/MasterNav.tsx`
- Create: `web/src/components/layout/Sidebar.tsx`
- Create: `web/src/components/layout/MainLayout.tsx`
- Create: `web/src/components/layout/PageHeader.tsx`
- Create: `web/src/components/layout/Breadcrumb.tsx`

- [ ] **Step 1: Create MasterNav component**

```typescript
// web/src/components/layout/MasterNav.tsx
import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Search,
  User,
  ChevronDown,
  Settings,
  LogOut,
  Key,
  BarChart3,
  Moon,
  Sun,
  Monitor,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/Badge'

export function MasterNav() {
  const { user, logout, simulatedRole, setSimulatedRole, isSysAdmin } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setAvatarOpen(false)
      }
      if (alertRef.current && !alertRef.current.contains(event.target as Node)) {
        setAlertOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'apple', label: 'Apple', icon: Monitor },
  ]

  return (
    <header className="master-nav">
      {/* Left: Logo */}
      <Link to="/" className="flex items-center gap-3">
        <div
          className="w-8 h-8 flex items-center justify-center font-bold text-lg"
          style={{
            background: 'var(--brand-main)',
            color: 'var(--bg-body)',
            borderRadius: 'var(--border-radius-base)',
          }}
        >
          A
        </div>
        <span className="text-xl font-bold tracking-tight">
          AiGate{' '}
          <span className="text-secondary text-sm ml-1 font-normal">Enterprise</span>
        </span>
      </Link>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <button
          onClick={() => {/* Open search modal */}}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors rounded-lg"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <Search size={16} />
          <span className="hidden md:inline">搜索</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-surface rounded"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Alert Bell */}
        <div ref={alertRef} className="relative">
          <button
            onClick={() => setAlertOpen(!alertOpen)}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-elevated transition-colors"
          >
            <Bell size={18} className="text-secondary" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border border-surface" />
          </button>
          {alertOpen && (
            <div className="absolute right-0 mt-2 w-80 card p-0 shadow-dropdown z-50">
              <div className="p-4 border-b font-bold flex justify-between items-center"
                style={{ borderColor: 'var(--border-color)' }}
              >
                系统预警与通知 <Badge variant="warning">2</Badge>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {/* Alert items */}
              </div>
              <Link
                to="/alerts"
                className="p-3 text-center text-xs font-bold text-secondary hover:text-primary transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                查看全部
              </Link>
            </div>
          )}
        </div>

        {/* Avatar Dropdown */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-8 h-8 border flex items-center justify-center text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              background: 'var(--brand-main)',
              color: 'white',
              borderRadius: 'var(--border-radius-base)',
              borderColor: 'var(--border-color)',
            }}
          >
            {user?.name?.slice(0, 2) || 'AD'}
          </button>
          {avatarOpen && (
            <div className="absolute right-0 mt-2 w-64 card p-0 shadow-dropdown z-50">
              {/* User info */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="font-bold">
                  {user?.name || '张三'}{' '}
                  <Badge variant="info" size="sm">
                    {simulatedRole?.toUpperCase() || 'SYS'}
                  </Badge>
                </div>
                <div className="text-xs text-secondary mt-1">
                  {user?.tenantName || '北京研发中心'}
                </div>
              </div>

              {/* Menu items */}
              <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-elevated text-secondary hover:text-primary transition-colors"
                  onClick={() => setAvatarOpen(false)}
                >
                  <User size={16} /> 个人资料
                </Link>
                <Link
                  to="/keys"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-elevated text-secondary hover:text-primary transition-colors"
                  onClick={() => setAvatarOpen(false)}
                >
                  <Key size={16} /> 我的密钥 <span className="ml-auto text-xs font-mono">2/3</span>
                </Link>
                <Link
                  to="/billing"
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-elevated text-secondary hover:text-primary transition-colors"
                  onClick={() => setAvatarOpen(false)}
                >
                  <BarChart3 size={16} /> 我的用量
                </Link>
              </div>

              {/* Role simulation (demo only) */}
              <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between px-3 py-2 rounded-md text-secondary">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} /> 模拟角色
                  </div>
                  <select
                    value={simulatedRole || ''}
                    onChange={(e) => setSimulatedRole(e.target.value as any || null)}
                    className="bg-transparent border-none outline-none cursor-pointer font-bold text-xs"
                  >
                    <option value="">默认</option>
                    <option value="sys_admin">SYS</option>
                    <option value="tenant_admin">TENANT</option>
                    <option value="user">USER</option>
                  </select>
                </div>

                {/* Theme switcher */}
                <div className="flex items-center justify-between px-3 py-2 rounded-md text-secondary">
                  <div className="flex items-center gap-3">
                    <Monitor size={16} /> 主题
                  </div>
                  <div className="flex gap-1 p-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as any)}
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          theme === option.value ? 'bg-surface' : ''
                        }`}
                        style={{
                          backgroundColor: theme === option.value ? 'var(--bg-surface)' : undefined,
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-500/10 text-red-500 transition-colors w-full"
                >
                  <LogOut size={16} /> 退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create Sidebar component**

```typescript
// web/src/components/layout/Sidebar.tsx
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Users2,
  Building2,
  Key,
  FileText,
  Puzzle,
  BookOpen,
  Bot,
  Bell,
  Settings,
  Receipt,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard,
  Plug,
  Code2,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/ui'
import { clsx } from 'clsx'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles?: string[]
}

interface NavGroup {
  id: string
  label: string
  icon?: React.ReactNode
  items: NavItem[]
  roles?: string[]
}

const navGroups: NavGroup[] = [
  {
    id: 'data-center',
    label: '数据中心',
    items: [
      { label: '数据大盘', path: '/dashboard', icon: <BarChart3 size={18} />, roles: ['sys_admin', 'tenant_admin', 'dept_lead', 'project_lead'] },
      { label: '我的工作台', path: '/workspace', icon: <LayoutDashboard size={18} />, roles: ['user'] },
    ],
  },
  {
    id: 'org-governance',
    label: '组织治理',
    items: [
      { label: '组织与配额', path: '/organization', icon: <Building2 size={18} />, roles: ['sys_admin', 'tenant_admin'] },
      { label: '用户管理', path: '/users', icon: <Users2 size={18} />, roles: ['sys_admin', 'tenant_admin'] },
      { label: '配额申请审批', path: '/quota-approval', icon: <Receipt size={18} />, roles: ['sys_admin', 'tenant_admin', 'dept_lead', 'project_lead'] },
      { label: '套餐与计费', path: '/subscription', icon: <Receipt size={18} />, roles: ['sys_admin'] },
    ],
  },
  {
    id: 'gateway',
    label: '网关与接入',
    items: [
      { label: '渠道管理', path: '/channels', icon: <Plug size={18} />, roles: ['sys_admin'] },
      { label: '模型资产', path: '/models', icon: <Puzzle size={18} />, roles: ['sys_admin'] },
      { label: '密钥管理', path: '/keys', icon: <Key size={18} /> },
      { label: '调用日志', path: '/logs', icon: <FileText size={18} /> },
      { label: '消耗报表', path: '/billing', icon: <BarChart3 size={18} />, roles: ['sys_admin', 'tenant_admin'] },
    ],
  },
  {
    id: 'knowledge',
    label: '知识库',
    items: [
      { label: '项目知识库', path: '/knowledge', icon: <BookOpen size={18} />, roles: ['sys_admin', 'dept_lead', 'project_lead'] },
    ],
  },
  {
    id: 'assets',
    label: 'AI 资产市场',
    items: [
      { label: '提示词库', path: '/prompts', icon: <FileText size={18} /> },
      { label: 'MCP 工具', path: '/mcp', icon: <Puzzle size={18} />, roles: ['sys_admin', 'tenant_admin'] },
      { label: 'Skills 技能库', path: '/skills', icon: <Workflow size={18} />, roles: ['sys_admin', 'tenant_admin', 'project_lead'] },
      { label: 'Plugins 插件库', path: '/plugins', icon: <Plug size={18} />, roles: ['sys_admin', 'tenant_admin', 'project_lead'] },
      { label: 'Hooks 钩子库', path: '/hooks', icon: <Code2 size={18} />, roles: ['sys_admin'] },
    ],
  },
  {
    id: 'agent',
    label: 'Agent 中心',
    items: [
      { label: 'Agent 中心', path: '/agent', icon: <Bot size={18} /> },
    ],
  },
  {
    id: 'monitoring',
    label: '监控与合规',
    items: [
      { label: '预警中心', path: '/alerts', icon: <Bell size={18} /> },
      { label: '操作审计', path: '/audit', icon: <ShieldCheck size={18} />, roles: ['sys_admin'] },
    ],
  },
  {
    id: 'system',
    label: '系统',
    items: [
      { label: '系统设置', path: '/settings', icon: <Settings size={18} />, roles: ['sys_admin', 'tenant_admin'] },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()
  const { hasRole, getEffectiveRole } = useAuth()
  const { expandedGroups, toggleGroup, sidebarCollapsed } = useUIStore()

  const currentRole = getEffectiveRole()

  const isItemVisible = (item: NavItem) => {
    if (!item.roles) return true
    return item.roles.includes(currentRole)
  }

  const isGroupVisible = (group: NavGroup) => {
    if (group.roles && !group.roles.includes(currentRole)) return false
    return group.items.some(isItemVisible)
  }

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      <nav className="space-y-1">
        {navGroups.filter(isGroupVisible).map((group) => (
          <div key={group.id} className="nav-group py-2">
            <button
              onClick={() => toggleGroup(group.id)}
              className="nav-group-header w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              <span>{group.label}</span>
              <ChevronDown
                size={14}
                className={clsx(
                  'transform transition-transform duration-200',
                  expandedGroups.includes(group.id) && 'rotate-180'
                )}
              />
            </button>
            {expandedGroups.includes(group.id) && (
              <div className="nav-items-container space-y-0.5 mt-1">
                {group.items.filter(isItemVisible).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'nav-item',
                      location.pathname === item.path && 'active'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Create MainLayout component**

```typescript
// web/src/components/layout/MainLayout.tsx
import React from 'react'
import { Outlet } from 'react-router-dom'
import { MasterNav } from './MasterNav'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { useUIStore } from '@/stores/ui'
import { clsx } from 'clsx'

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <MasterNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={clsx(
            'flex-1 overflow-y-auto p-6 transition-all duration-300',
            sidebarCollapsed ? 'ml-0' : 'ml-0'
          )}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
```

- [ ] **Step 4: Create PageHeader component**

```typescript
// web/src/components/layout/PageHeader.tsx
import React from 'react'
import { Breadcrumb } from './Breadcrumb'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: { label: string; path?: string }[]
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && <Breadcrumb items={breadcrumbs} className="mb-4" />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 5: Create Breadcrumb component**

```typescript
// web/src/components/layout/Breadcrumb.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={clsx('flex items-center gap-2 text-sm', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight size={14} className="text-muted" />
          )}
          {item.path ? (
            <Link
              to={item.path}
              className="text-secondary hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-primary font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/layout/
git commit -m "feat: add layout components (MasterNav, Sidebar, MainLayout, PageHeader, Breadcrumb)"
```

---

## Task 7: Setup React Router with All Pages

**Files:**
- Create: `web/src/App.tsx`
- Create: `web/src/pages/Login.tsx` (placeholder)
- Create: `web/src/pages/Dashboard.tsx` (placeholder)
- Create: `web/src/pages/errors/NotFound.tsx`

- [ ] **Step 1: Create App.tsx with routing**

```typescript
// web/src/App.tsx
import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'

// Page imports (lazy loaded in production)
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
import NotFound from '@/pages/errors/NotFound'
import Forbidden from '@/pages/errors/Forbidden'
import ServerError from '@/pages/errors/ServerError'

function App() {
  const { theme } = useThemeStore()
  const { isAuthenticated } = useAuthStore()

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="/403" element={<Forbidden />} />
      <Route path="/500" element={<ServerError />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}
      >
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
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 2: Create Login page placeholder**

```typescript
// web/src/pages/Login.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Moon, Sun, Monitor } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Mock login
    setTimeout(() => {
      login(
        {
          id: '1',
          name: '张三',
          email: 'zhangsan@aigate.com',
          role: 'sys_admin',
          tenantId: '1',
          tenantName: '北京研发中心',
        },
        'mock-token'
      )
      navigate('/dashboard')
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-body)' }}
    >
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 mx-auto flex items-center justify-center font-bold text-2xl mb-4"
            style={{
              background: 'var(--brand-main)',
              color: 'var(--bg-body)',
              borderRadius: 'var(--border-radius-base)',
            }}
          >
            A
          </div>
          <h1 className="text-2xl font-bold">AiGate</h1>
          <p className="text-secondary mt-2">企业级 AI 全栈管控平台</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱"
            required
          />
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            required
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            登录
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setTheme('dark')}
            className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-elevated' : ''}`}
          >
            <Moon size={18} />
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`p-2 rounded-lg ${theme === 'light' ? 'bg-elevated' : ''}`}
          >
            <Sun size={18} />
          </button>
          <button
            onClick={() => setTheme('apple')}
            className={`p-2 rounded-lg ${theme === 'apple' ? 'bg-elevated' : ''}`}
          >
            <Monitor size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create Dashboard page placeholder**

```typescript
// web/src/pages/Dashboard.tsx
import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import {
  TrendingUp,
  Key,
  Puzzle,
  Bot,
  AlertTriangle,
} from 'lucide-react'

export default function Dashboard() {
  const { user, getEffectiveRole } = useAuth()

  return (
    <div>
      <PageHeader
        title="数据大盘"
        subtitle={`${user?.tenantName || '集团'} · 本月运营概览`}
        breadcrumbs={[
          { label: '数据中心' },
          { label: '数据大盘' },
        ]}
      />

      {/* Hero Section */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm">本月成本</p>
            <p className="text-3xl font-bold mt-1">¥ 15,234.56</p>
            <p className="text-secondary text-sm mt-2">
              P99 延迟 45ms · 成功率 99.8% · 审计合规 100%
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-main">2.4M</p>
              <p className="text-xs text-secondary">Token 消耗</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">156</p>
              <p className="text-xs text-secondary">活跃密钥</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">89</p>
              <p className="text-xs text-secondary">MCP 调用</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-secondary">
              Token 消耗
            </CardTitle>
            <TrendingUp size={18} className="text-brand-main" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">2.4M</p>
            <p className="text-xs text-secondary mt-1">较上月 +12%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-secondary">
              活跃密钥
            </CardTitle>
            <Key size={18} className="text-brand-main" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">156</p>
            <p className="text-xs text-secondary mt-1">较上月 +8</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-secondary">
              MCP 调用
            </CardTitle>
            <Puzzle size={18} className="text-brand-main" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">89</p>
            <p className="text-xs text-secondary mt-1">较上月 -5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-secondary">
              Agent 对话
            </CardTitle>
            <Bot size={18} className="text-brand-main" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1,234</p>
            <p className="text-xs text-secondary mt-1">较上月 +23%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>近 30 天 Token 趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-secondary">
              图表加载中...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待处理风险</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <AlertTriangle size={18} className="text-warning" />
                <div className="flex-1">
                  <p className="font-medium">配额水位预警 (90%)</p>
                  <p className="text-xs text-secondary">北京研发中心</p>
                </div>
                <Badge variant="warning">待处理</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create error pages**

```typescript
// web/src/pages/errors/NotFound.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-body)' }}
    >
      <div className="text-center">
        <h1 className="text-9xl font-bold text-brand-main">404</h1>
        <h2 className="text-2xl font-bold mt-4">页面未找到</h2>
        <p className="text-secondary mt-2">
          您访问的页面不存在或已被移除
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link to="/">
            <Button variant="primary" icon={<Home size={16} />}>
              返回首页
            </Button>
          </Link>
          <Button
            variant="secondary"
            icon={<ArrowLeft size={16} />}
            onClick={() => window.history.back()}
          >
            返回上页
          </Button>
        </div>
      </div>
    </div>
  )
}
```

```typescript
// web/src/pages/errors/Forbidden.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, Lock } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-body)' }}
    >
      <div className="text-center">
        <Lock size={64} className="mx-auto text-error" />
        <h1 className="text-4xl font-bold mt-4">403</h1>
        <h2 className="text-2xl font-bold mt-2">权限不足</h2>
        <p className="text-secondary mt-2">
          您没有权限访问此页面，请联系管理员
        </p>
        <Link to="/" className="inline-block mt-8">
          <Button variant="primary" icon={<Home size={16} />}>
            返回首页
          </Button>
        </Link>
      </div>
    </div>
  )
}
```

```typescript
// web/src/pages/errors/ServerError.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home, RefreshCw } from 'lucide-react'

export default function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-body)' }}
    >
      <div className="text-center">
        <h1 className="text-9xl font-bold text-error">500</h1>
        <h2 className="text-2xl font-bold mt-4">服务器错误</h2>
        <p className="text-secondary mt-2">
          服务器出现了问题，请稍后重试
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link to="/">
            <Button variant="primary" icon={<Home size={16} />}>
              返回首页
            </Button>
          </Link>
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} />}
            onClick={() => window.location.reload()}
          >
            刷新页面
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create placeholder pages for all routes**

For each remaining page, create a minimal placeholder:

```typescript
// Example: web/src/pages/MyWorkspace.tsx
import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'

export default function MyWorkspace() {
  return (
    <div>
      <PageHeader
        title="我的工作台"
        breadcrumbs={[{ label: '数据中心' }, { label: '我的工作台' }]}
      />
      <div className="card">
        <p className="text-secondary">页面开发中...</p>
      </div>
    </div>
  )
}
```

Create similar placeholders for: Organization, Users, Keys, Logs, Alerts, Knowledge, KnowledgeDetail, Mcp, McpDetail, Agent, AgentCreate, AgentChat, Prompts, PromptDetail, Skills, Plugins, Hooks, Settings, Channels, Models, Billing, Subscription, QuotaApproval, Audit, Status, Developer, Onboarding

- [ ] **Step 6: Verify the app runs**

Run: `cd web && npm run dev`
Expected: App starts, login page shows, can login and navigate

- [ ] **Step 7: Commit**

```bash
git add web/src/
git commit -m "feat: add routing, login page, dashboard, and error pages"
```

---

## Task 8: Add Utility Functions and Types

**Files:**
- Create: `web/src/lib/utils.ts`
- Create: `web/src/lib/constants.ts`
- Create: `web/src/lib/api.ts`
- Create: `web/src/types/index.ts`
- Create: `web/src/types/api.ts`
- Create: `web/src/types/models.ts`

- [ ] **Step 1: Create utils.ts**

```typescript
// web/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} 天前`
  if (hours > 0) return `${hours} 小时前`
  if (minutes > 0) return `${minutes} 分钟前`
  return '刚刚'
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

- [ ] **Step 2: Create constants.ts**

```typescript
// web/src/lib/constants.ts
export const APP_NAME = 'AiGate'
export const APP_VERSION = '2.0.0'

export const ROLES = {
  SYS_ADMIN: 'sys_admin',
  TENANT_ADMIN: 'tenant_admin',
  DEPT_LEAD: 'dept_lead',
  PROJECT_LEAD: 'project_lead',
  USER: 'user',
} as const

export const ROLE_LABELS: Record<string, string> = {
  sys_admin: '集团 IT 管理员',
  tenant_admin: '分公司管理员',
  dept_lead: '部门负责人',
  project_lead: '项目负责人',
  user: '普通员工',
}

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  APPLE: 'apple',
} as const

export const KEY_STATUS = {
  ACTIVE: 'active',
  RATE_LIMITED: 'rate_limited',
  BANNED: 'banned',
  EXPIRED: 'expired',
  EXPIRING_SOON: 'expiring_soon',
} as const

export const KEY_STATUS_LABELS: Record<string, string> = {
  active: '正常',
  rate_limited: '已限速',
  banned: '已封禁',
  expired: '已过期',
  expiring_soon: '即将过期',
}

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
} as const

export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  warning: '警告',
  info: '信息',
}
```

- [ ] **Step 3: Create api.ts**

```typescript
// web/src/lib/api.ts
import { useAuthStore } from '@/stores/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

interface RequestConfig extends RequestInit {
  params?: Record<string, string>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getHeaders(): HeadersInit {
    const { token } = useAuthStore.getState()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }
    return url.toString()
  }

  async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const { params, ...fetchConfig } = config
    const url = this.buildUrl(path, params)

    const response = await fetch(url, {
      ...fetchConfig,
      headers: {
        ...this.getHeaders(),
        ...fetchConfig.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new ApiError(response.status, error.message || '请求失败', error)
    }

    return response.json()
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>(path, { method: 'GET', params })
  }

  post<T>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  put<T>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  patch<T>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

export class ApiError extends Error {
  status: number
  details?: any

  constructor(status: number, message: string, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const api = new ApiClient(API_BASE_URL)
```

- [ ] **Step 4: Create types**

```typescript
// web/src/types/index.ts
export type Role = 'sys_admin' | 'tenant_admin' | 'dept_lead' | 'project_lead' | 'user'
export type Theme = 'dark' | 'light' | 'apple'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: Role
  tenantId: string
  tenantName: string
  department?: string
}

export interface Tenant {
  id: string
  name: string
  logo?: string
  parentId?: string
  quota: Quota
}

export interface Quota {
  tokenLimit: number
  tokenUsed: number
  costLimit: number
  costUsed: number
  period: 'month' | 'quarter' | 'year'
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  status: 'active' | 'rate_limited' | 'banned' | 'expired' | 'expiring_soon'
  userId: string
  userName: string
  expiresAt: string
  createdAt: string
  lastUsedAt?: string
  usage7d: number
}

export interface MCPTool {
  id: string
  name: string
  description: string
  url: string
  protocol: 'stdio' | 'sse' | 'http'
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  category: string
  isPublic: boolean
  usageCount: number
}

export interface Agent {
  id: string
  name: string
  description: string
  type: 'bot' | 'project' | 'department'
  status: 'running' | 'draft' | 'error'
  model: string
  knowledgeBases: string[]
  mcpTools: string[]
  usage7d: number
  avgResponseTime: number
}

export interface Alert {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  target: string
  createdAt: string
  status: 'pending' | 'processing' | 'resolved'
}
```

```typescript
// web/src/types/api.ts
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface ApiError {
  code: string
  message: string
  details?: any
  trace_id?: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/ web/src/types/
git commit -m "feat: add utility functions, constants, API client, and types"
```

---

## Summary

After completing all 8 tasks, you will have:

1. ✅ Vite + React + TypeScript project initialized
2. ✅ Tailwind CSS v4 with three-theme system (dark/light/apple)
3. ✅ Zustand stores for theme, auth, and UI state
4. ✅ Custom hooks for theme, auth, and role management
5. ✅ Core UI components (Button, Card, Badge, Input, Modal, Drawer, Toast, Skeleton, EmptyState, Tabs)
6. ✅ Layout components (MasterNav, Sidebar, MainLayout, PageHeader, Breadcrumb)
7. ✅ React Router with all page routes
8. ✅ Utility functions, API client, and TypeScript types

**Next Steps:**
- Phase 2: Implement each page with full functionality
- Phase 3: Add ECharts integration for data visualization
- Phase 4: Implement API integration with backend

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-20-aigate-frontend-phase1-foundation.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
