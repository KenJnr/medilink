// components/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  full_name: string
  role: 'patient' | 'doctor' | 'admin'
}

interface AuthContextType {
  user: User | null
  userRole: 'patient' | 'doctor' | 'admin' | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'patient' | 'doctor' | 'admin' | null>(null)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)
  const router = useRouter()
  const supabase = createClient()

  const loadUser = async (): Promise<User | null> => {
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !authUser) {
      if (isMounted.current) {
        setUser(null)
        setUserRole(null)
      }
      return null
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // Auto-provision a row if the trigger/insert-on-signup didn't create one yet.
    if (error?.code === 'PGRST116') {
      const role = authUser.user_metadata?.role || 'patient'
      const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          full_name: fullName,
          email: authUser.email,
          role,
          status: 'active',
        })
        .select()
        .single()

      if (insertError || !newUser) {
        if (isMounted.current) {
          setUser(null)
          setUserRole(null)
        }
        return null
      }

      const applicationUser: User = {
        id: authUser.id,
        email: newUser.email || authUser.email || '',
        full_name: newUser.full_name || 'User',
        role: newUser.role,
      }
      if (isMounted.current) {
        setUser(applicationUser)
        setUserRole(applicationUser.role)
      }
      return applicationUser
    }

    if (error || !profile) {
      if (isMounted.current) {
        setUser(null)
        setUserRole(null)
      }
      return null
    }

    const applicationUser: User = {
      id: profile.id,
      email: profile.email || authUser.email || '',
      full_name: profile.full_name || authUser.user_metadata?.full_name || 'User',
      role: profile.role,
    }

    if (isMounted.current) {
      setUser(applicationUser)
      setUserRole(applicationUser.role)
    }
    return applicationUser
  }

  useEffect(() => {
    isMounted.current = true

    const initialize = async () => {
      await loadUser()
      if (isMounted.current) setLoading(false)
    }
    initialize()

    // IMPORTANT: this listener only updates state. It never navigates.
    // Navigation after sign-in/sign-up happens exactly once, from the
    // login/register page itself, right after a successful call.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setUserRole(null)
        setLoading(false)
        return
      }

      await loadUser()
      if (isMounted.current) setLoading(false)
    })

    return () => {
      isMounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}