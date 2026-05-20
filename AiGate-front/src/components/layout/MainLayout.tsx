import { Outlet } from 'react-router-dom'
import { MasterNav } from './MasterNav'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { useKeyboard } from '@/hooks/useKeyboard'

export function MainLayout() {
  useKeyboard()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <MasterNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
      <GlobalSearch />
    </div>
  )
}
