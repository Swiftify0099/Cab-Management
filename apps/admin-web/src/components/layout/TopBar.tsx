import { Bell, Moon, Sun, Menu, Search } from 'lucide-react'
import { useState } from 'react'

interface TopBarProps {
  onMenuToggle: () => void
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const [darkMode, setDarkMode] = useState(false)

  const toggleDark = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="fixed top-0 right-0 left-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 z-40 gap-4">
      <button
        id="menu-toggle-btn"
        onClick={onMenuToggle}
        className="btn-ghost p-2 rounded-xl"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="global-search"
            type="text"
            placeholder="Search drivers, customers, trips..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <button id="notifications-btn" className="btn-ghost p-2 rounded-xl relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Dark mode */}
        <button id="theme-toggle" onClick={toggleDark} className="btn-ghost p-2 rounded-xl">
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  )
}
