// app/(auth)/login/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'

export default function LoginPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const hasRedirected = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const supabase = createClient()

  // Only redirect once when user is authenticated
  useEffect(() => {
    console.log('Login page - user:', user, 'role:', userRole)
    
    if (!authLoading && user && userRole && !hasRedirected.current) {
      console.log('Redirecting to:', `/${userRole}`)
      hasRedirected.current = true
      window.location.href = `/${userRole}`
    }
  }, [user, userRole, authLoading])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      console.log('Attempting login for:', email)
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      console.log('Login response data:', data)
      console.log('Login error:', authError)

      if (authError) {
        setError(authError.message)
        return
      }

      if (data?.user) {
        console.log('Login successful, user ID:', data.user.id)
        
        // Get the user's role from YOUR users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()
        
        console.log('User role from users table:', userData, userError)
        
        if (userData?.role) {
          // Redirect directly
          console.log('Redirecting to:', `/${userData.role}`)
          hasRedirected.current = true
          window.location.href = `/${userData.role}`
          return
        } else {
          // If user doesn't exist in users table, create them
          console.log('User not found in users table, creating...')
          
          const role = data.user.user_metadata?.role || 'patient'
          
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name || data.user.email,
              email: data.user.email,
              role: role,
              status: 'active',
            })
            .select()
            .single()
          
          if (insertError) {
            console.error('Failed to create user:', insertError)
            setError('User profile not found. Please contact support.')
            await supabase.auth.signOut()
            return
          }
          
          if (newUser) {
            console.log('User created with role:', newUser.role)
            hasRedirected.current = true
            window.location.href = `/${newUser.role}`
            return
          }
        }
      }
      
    } catch (error) {
      console.error('Login error:', error)
      setError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while signing in.'
      )
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword((current) => !current)
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* =========================
          LEFT IMAGE
      ========================== */}
      <div className="relative hidden lg:flex lg:w-1/2">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/register.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-linear-to-r from-black/70 to-black/40" />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold">
              Welcome Back
            </h1>

            <p className="mb-6 text-lg text-white/80">
              Sign in to continue your healthcare journey with MediLink.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                  <span className="text-sm">✓</span>
                </div>

                <span className="text-sm text-white/80">
                  Access your appointments
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                  <span className="text-sm">✓</span>
                </div>

                <span className="text-sm text-white/80">
                  Manage your healthcare
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                  <span className="text-sm">✓</span>
                </div>

                <span className="text-sm text-white/80">
                  Book appointments easily
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          FORM
      ========================== */}
      <div className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-8">
        <div className="w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/">
              <h1 className="text-3xl font-bold text-blue-600">
                MediLink
              </h1>
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            
            {/* Header */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome Back
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 transition-colors hover:text-blue-500"
                >
                  Create one
                </Link>
              </p>
            </div>

            <form
              className="space-y-5"
              onSubmit={handleLogin}
            >
              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-black/80 outline-none transition-colors placeholder:text-black/40 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="example@domain.com"
                />
              </div>

              {/* Password */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-12 text-black/80 outline-none transition-colors placeholder:text-black/40 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password"
                  />

                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition hover:text-gray-700"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />

                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                <label
                  htmlFor="remember"
                  className="text-sm text-gray-600"
                >
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />

                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>

                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Home */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}