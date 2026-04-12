import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) return toast.error('Passwords do not match')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    setSubmitting(true)
    const { error } = await signUp({ email, password, fullName })
    setSubmitting(false)
    if (error) return toast.error(error.message || 'Sign-up failed')
    toast.success('Account created')
    navigate('/account', { replace: true })
  }

  return (
    <main className="flex-1 py-20">
      <div className="max-w-md mx-auto px-6">
        <h1 className="text-4xl font-serif-display">Create account</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Join PHONEX to save your wishlist, track orders, and unlock member pricing.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <Field id="fullName" label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
          <Field id="email" label="Email" type="email" required value={email} onChange={setEmail} autoComplete="email" />
          <Field id="password" label="Password" type="password" required minLength={6} value={password} onChange={setPassword} autoComplete="new-password" />
          <Field id="confirm" label="Confirm password" type="password" required minLength={6} value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="gold-text underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}

function Field({ id, label, value, onChange, type = 'text', ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs uppercase tracking-[0.2em]">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
        style={{ borderColor: 'hsl(var(--border))' }}
        {...rest}
      />
    </div>
  )
}
