import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Car, Users, Map, Package, Hotel, DollarSign,
  Tag, Palette, BadgeCheck, BarChart3, Settings, ChevronLeft,
  ChevronRight, LogOut
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',   section: 'main' },
  { path: '/drivers',    icon: Car,             label: 'Drivers',      section: 'main' },
  { path: '/customers',  icon: Users,           label: 'Customers',    section: 'main' },
  { path: '/trips',      icon: Map,             label: 'Trips',        section: 'main' },
  { path: '/parcels',    icon: Package,         label: 'Parcels',      section: 'main' },
  { path: '/hotels',     icon: Hotel,           label: 'Hotels',       section: 'business' },
  { path: '/finance',    icon: DollarSign,      label: 'Finance',      section: 'business' },
  { path: '/coupons',    icon: Tag,             label: 'Coupons',      section: 'business' },
  { path: '/kyc',        icon: BadgeCheck,      label: 'KYC Review',   section: 'operations' },
  { path: '/analytics',  icon: BarChart3,       label: 'Analytics',    section: 'operations' },
  { path: '/themes',     icon: Palette,         label: 'Themes',       section: 'config' },
  { path: '/settings',   icon: Settings,        label: 'Settings',     section: 'config' },
]

const sectionLabels: Record<string, string> = {
  main: 'Core',
  business: 'Business',
  operations: 'Operations',
  config: 'Configuration',
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const sections = ['main', 'business', 'operations', 'config']

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden"
      style={{ width: collapsed ? 72 : 260 }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-gradient-brand rounded-xl flex items-center justify-center flex-shrink-0 shadow-glow-primary">
            <Car className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="min-w-0"
              >
                <p className="text-sm font-display font-bold text-slate-900 dark:text-white leading-none">
                  CabBooking
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Admin Console</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hidden">
        {sections.map((section) => {
          const items = navItems.filter((i) => i.section === section)
          return (
            <div key={section} className="mb-4">
              {!collapsed && (
                <p className="section-label">{sectionLabels[section]}</p>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  id={`nav-${item.path.replace('/', '')}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer text-sm font-medium ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex-shrink-0">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-xl bg-slate-50 dark:bg-slate-800">
            <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                {user.email}
              </p>
              <p className="text-xs text-slate-400 capitalize">{user.role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 text-sm font-medium"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        id="sidebar-toggle"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-slate-500" />
          : <ChevronLeft className="w-3 h-3 text-slate-500" />
        }
      </button>
    </motion.aside>
  )
}
