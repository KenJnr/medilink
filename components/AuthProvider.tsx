// components/AuthProvider.tsx
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
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

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<
    'patient' | 'doctor' | 'admin' | null
  >(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const pathname = usePathname()

  const supabase = createClient()

  const loadUser = async () => {
    try {
      // Get the user from Supabase Auth
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      console.log('Auth user from getUser:', authUser?.id, 'Error:', userError)

      if (userError || !authUser) {
        console.log('No user found')
        setUser(null)
        setUserRole(null)
        return null
      }

      console.log('Auth user found:', authUser.id)

      // Get user profile from YOUR users table
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('Profile from users table:', profile)

      if (error) {
        console.error('Failed to load profile:', error)
        
        if (error.code === 'PGRST116') {
          console.log('User not found in users table, creating...')
          
          const role = authUser.user_metadata?.role || 'patient'
          const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
          
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              full_name: fullName,
              email: authUser.email,
              role: role,
              status: 'active',
            })
            .select()
            .single()

          if (insertError) {
            console.error('Failed to create user:', insertError)
            setUser(null)
            setUserRole(null)
            return null
          }

          if (newUser) {
            const applicationUser: User = {
              id: authUser.id,
              email: newUser.email || authUser.email || '',
              full_name: newUser.full_name || 'User',
              role: newUser.role,
            }
            console.log('New user created:', applicationUser)
            setUser(applicationUser)
            setUserRole(newUser.role)
            return applicationUser
          }
        }
        
        setUser(null)
        setUserRole(null)
        return null
      }

      if (!profile) {
        setUser(null)
        setUserRole(null)
        return null
      }

      const applicationUser: User = {
        id: profile.id,
        email: profile.email || authUser.email || '',
        full_name: profile.full_name || authUser.user_metadata?.full_name || 'User',
        role: profile.role,
      }

      console.log('Application user loaded:', applicationUser)
      console.log('Full name:', applicationUser.full_name)
      
      setUser(applicationUser)
      setUserRole(profile.role)

      return applicationUser
    } catch (error) {
      console.error('Auth initialization error:', error)
      setUser(null)
      setUserRole(null)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      await loadUser()
      if (mounted) {
        setLoading(false)
      }
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'Session user:', session?.user?.id)
        
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const applicationUser = await loadUser()
          
          console.log('Application user after sign in:', applicationUser)
          
          if (applicationUser?.role) {
            console.log('Redirecting to dashboard:', applicationUser.role)
            window.location.href = `/${applicationUser.role}`
          }
        }

        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}