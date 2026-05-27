import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, MapPin, Package, Hotel, Menu, X, User, Wallet, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { authApi } from '../../api/client'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { href: '/book', label: 'Book Cab', icon: Car },
  { href: '/parcels', label: 'Parcels', icon: Package },
  { href: '/hotels', label: 'Hotels', icon: Hotel },
  { href: '/trips', label: 'My Trips', icon: MapPin },
]

export function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/book" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <Car size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900">CabBooking</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>

        {/* User Menu */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/wallet" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Wallet size={15} /> Wallet
          </Link>
          <div className="relative">
            <button
              onClick={() => setDropOpen(v => !v)}
              className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors"
            >
              <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">{user?.phone?.slice(-4)}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
                <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <User size={14} /> My Profile
                </Link>
                <hr className="my-1 border-slate-100" />
                <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 rounded-lg text-slate-600" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
          <hr className="border-slate-100 my-1" />
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </nav>
  )
}
