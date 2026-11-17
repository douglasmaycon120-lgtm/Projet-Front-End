import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { ApiUser } from './types'

type AuthValue = { token: string | null; user: ApiUser | null; loading: boolean; signIn: (user: string, password: string) => Promise<void>; signOut: () => void }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('crm-token'))
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('crm-token')))

  const signOut = useCallback(() => {
    localStorage.removeItem('crm-token')
    setToken(null)
    setUser(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    const expired = () => signOut()
    window.addEventListener('crm:unauthorized', expired)
    return () => window.removeEventListener('crm:unauthorized', expired)
  }, [signOut])

  useEffect(() => {
    if (!token) return
    let active = true
    api.me().then((profile) => { if (active) setUser(profile) }).catch(() => { if (active) signOut() }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, signOut])

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password)
    localStorage.setItem('crm-token', result.accessToken)
    setToken(result.accessToken)
    setLoading(true)
    try {
      setUser(await api.me())
    } catch (error) {
      signOut()
      throw error
    } finally {
      setLoading(false)
    }
  }, [signOut])

  const value = useMemo(() => ({ token, user, loading, signIn, signOut }), [token, user, loading, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
