import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '72px' : '260px' }}
      >
        <TopBar onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="p-6 pt-[80px] min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
