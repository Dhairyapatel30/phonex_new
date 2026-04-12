// Navbar.jsx
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, User, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useCartCount } from '../hooks/useCart.js'
import { toast } from 'sonner'

const NAV_LINKS = [
  { to: '/category', label: 'Shop' },
  { to: '/category/smartphones', label: 'Phones' },
  { to: '/category/wearables', label: 'Wearables' },
  { to: '/category/tablets', label: 'Tablets' },
  { to: '/category/accessories', label: 'Accessories' },
  { to: '/compatibility', label: 'Fit check' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut } = useAuth()
  const cartCount = useCartCount()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm"
        style={{ borderBottom: '0.5px solid hsl(var(--border))' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">

          {/* Logo */}
          <Link
            to="/"
            className="font-serif-display text-sm font-normal tracking-[0.35em] shrink-0 hover:gold-text transition-colors"
          >
            P H O N E X
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/category'}
                className={({ isActive }) =>
                  `text-xs uppercase tracking-[0.15em] font-medium transition-colors ${
                    isActive
                      ? 'gold-text'
                      : 'text-foreground hover:opacity-70'
                  }`
                }
                style={{ color: undefined }}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-5">
            {/* Cart */}
            <Link to="/cart" className="relative p-1 hover:opacity-70 transition-opacity">
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-medium gold-bg"
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/account"
                  className="flex items-center gap-2 p-1 hover:opacity-70 transition-opacity"
                  title={user.email}
                >
                  <User size={18} strokeWidth={1.5} />
                  <span className="hidden sm:inline text-xs uppercase tracking-[0.15em] font-medium max-w-[140px] truncate">
                    {user.fullName || user.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-1 hover:opacity-70 transition-opacity"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:block text-xs uppercase tracking-[0.15em] font-medium hover:opacity-70 transition-opacity"
              >
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1 hover:opacity-70 transition-opacity"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden border-t bg-background py-6 px-6 flex flex-col gap-4"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="text-xs uppercase tracking-[0.15em] font-medium py-1 hover:opacity-70"
              >
                {link.label}
              </Link>
            ))}
            <div className="divider my-1" />
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false) }}
                className="text-xs uppercase tracking-[0.15em] font-medium py-1 text-left hover:opacity-70"
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-xs uppercase tracking-[0.15em] font-medium py-1 hover:opacity-70"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-xs uppercase tracking-[0.15em] font-medium py-1 hover:opacity-70"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        )}
      </header>
    </>
  )
}
