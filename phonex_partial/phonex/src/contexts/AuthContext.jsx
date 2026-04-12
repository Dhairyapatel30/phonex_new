import { createContext, useContext, useEffect, useState } from 'react'
import { api, setToken, getToken } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function signUp({ email, password, fullName }) {
    try {
      const res = await api.register({ email, password, fullName })
      setToken(res.token)
      setUser(res.user)
      return { data: res, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  async function signIn({ email, password }) {
    try {
      const res = await api.login({ email, password })
      setToken(res.token)
      setUser(res.user)
      return { data: res, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  async function signOut() {
    setToken(null)
    setUser(null)
    return { error: null }
  }

  async function refreshUser() {
    try {
      const res = await api.me()
      setUser(res.user)
    } catch {}
  }

  const value = { user, loading, signUp, signIn, signOut, refreshUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
