import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../lib/api.js'
import { toast } from 'sonner'

export default function AccountPage() {
  const { user, loading, refreshUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [saving, setSaving] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateProfile({ fullName })
      await refreshUser()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeAddress(id) {
    await api.deleteAddress(id)
    await refreshUser()
    toast.success('Address removed')
  }

  return (
    <main className="flex-1 py-16">
      <div className="max-w-4xl mx-auto px-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          <h1 className="text-2xl font-serif-display mb-4">Account</h1>
          <Link to="/account" className="block text-xs uppercase tracking-[0.15em]">Profile</Link>
          <Link to="/orders" className="block text-xs uppercase tracking-[0.15em]">Orders</Link>
          <Link to="/wishlist" className="block text-xs uppercase tracking-[0.15em]">Wishlist</Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="block text-xs uppercase tracking-[0.15em] gold-text">Admin</Link>
          )}
        </aside>

        <div className="space-y-8">
          <section className="rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-xl font-serif-display">Profile</h2>
            <form onSubmit={save} className="mt-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em]">Email</label>
                <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <label htmlFor="fullName" className="text-xs uppercase tracking-[0.2em]">Full name</label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
                  style={{ borderColor: 'hsl(var(--border))' }}
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-xl font-serif-display">Saved addresses</h2>
            {user.addresses?.length > 0 ? (
              <ul className="mt-6 space-y-4">
                {user.addresses.map((a) => (
                  <li key={a._id} className="flex justify-between items-start text-sm">
                    <div>
                      {a.line1}{a.line2 && `, ${a.line2}`}<br />
                      {a.city}, {a.state} {a.postalCode}<br />
                      {a.country}
                    </div>
                    <button onClick={() => removeAddress(a._id)} className="text-xs underline text-muted-foreground">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No addresses saved. Addresses entered at checkout are used for that order only.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
