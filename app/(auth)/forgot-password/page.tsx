// app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Column - Image (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/register.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-start p-12 text-white">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4">Reset Password</h1>
            <p className="text-lg text-white/80 mb-6">
              Don't worry, we've got you covered. Enter your email and we'll help you reset your password.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span className="text-sm text-white/80">Secure password reset</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span className="text-sm text-white/80">Quick and easy process</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span className="text-sm text-white/80">Get back to your healthcare journey</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo - Mobile */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600">MediLink</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {success ? (
              <div className="text-center">
                <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl">✓</span>
                    </div>
                    <p className="text-sm text-green-700 font-medium">
                      Password reset link sent!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Check your email for instructions to reset your password.
                    </p>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  ← Back to Sign In
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleReset}>
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-black/40"
                    placeholder="example@domain.com"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Remember your password?</span>
                  </div>
                </div>

                {/* Back to Login */}
                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}