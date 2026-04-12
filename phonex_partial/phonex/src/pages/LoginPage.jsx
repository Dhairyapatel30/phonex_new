import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/account'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await signIn({ email, password })
    setSubmitting(false)
    if (error) return toast.error(error.message || 'Sign-in failed')
    toast.success('Welcome back')
    navigate(redirectTo, { replace: true })
  }

  return (
    <main className="flex-1 py-20">
      <div className="max-w-md mx-auto px-6">
        <h1 className="text-4xl font-serif-display">Sign in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Welcome back to PHONEX. Sign in to access your cart, wishlist, and orders.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="text-xs uppercase tracking-[0.2em]">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs uppercase tracking-[0.2em]">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          No account?{' '}
          <Link to="/register" className="gold-text underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
