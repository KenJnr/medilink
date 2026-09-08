'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'

export default function RegisterPage() {
  const {
    user,
    userRole,
    loading: authLoading,
  } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
  })

  const supabase = createClient()

  /*
   * If the user is already authenticated,
   * don't allow them to remain on registration.
   */
  useEffect(() => {
    if (!authLoading && user && userRole) {
      window.location.replace(`/${userRole}`)
    }
  }, [user, userRole, authLoading])

  // =========================
  // VALIDATION
  // =========================

  const validateFullName = (name: string) => {
    if (!name.trim()) {
      return 'Full name is required'
    }

    if (name.trim().length < 2) {
      return 'Full name must be at least 2 characters'
    }

    return ''
  }

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return 'Email is required'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }

    return ''
  }

  const validatePassword = (value: string) => {
    if (!value) {
      return 'Password is required'
    }

    if (value.length < 6) {
      return 'Password must be at least 6 characters'
    }

    return ''
  }

  const fullNameError = touched.fullName
    ? validateFullName(fullName)
    : ''

  const emailError = touched.email
    ? validateEmail(email)
    : ''

  const passwordError = touched.password
    ? validatePassword(password)
    : ''

  // =========================
  // REGISTER
  // =========================

  const handleRegister = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    const nameError = validateFullName(fullName)
    const emailErr = validateEmail(email)
    const passError = validatePassword(password)

    if (nameError || emailErr || passError) {
      setTouched({
        fullName: true,
        email: true,
        password: true,
      })

      setError(
        nameError ||
          emailErr ||
          passError
      )

      return
    }

    setLoading(true)

    try {
      const normalizedEmail = email
        .trim()
        .toLowerCase()

      const normalizedName = fullName.trim()

      /*
       * IMPORTANT:
       *
       * We only create the Supabase Auth user here.
       *
       * The database trigger:
       *
       * auth.users
       *       ↓
       * public.users
       *       ↓
       * doctor_profiles (if doctor)
       *
       * handles the application records.
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            role,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError(
          'Unable to create your account. Please try again.'
        )
        return
      }

      /*
       * If email confirmation is disabled in Supabase,
       * authData.session should exist and AuthProvider
       * will receive SIGNED_IN and redirect automatically.
       *
       * If email confirmation is enabled, there will be
       * no session here and the user will need to confirm
       * their email before they can log in.
       */
      if (!authData.session) {
        setError(
          'Account created successfully. Please check your email to confirm your account before signing in.'
        )

        return
      }

      /*
       * DO NOT manually redirect here.
       *
       * AuthProvider handles:
       *
       * patient → /patient
       * doctor  → /doctor
       * admin   → /admin
       */
    } catch (error) {
      console.error(
        'Registration error:',
        error
      )

      setError(
        error instanceof Error
          ? error.message
          : 'Something went wrong during registration.'
      )
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(
      (current) => !current
    )
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
            backgroundImage:
              "url('/register.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-linear-to-r from-black/70 to-black/40" />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold">
              Welcome to MediLink
            </h1>

            <p className="mb-6 text-lg text-white/80">
              Create your account and start your
              healthcare journey with trusted doctors.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                  <span className="text-sm">
                    ✓
                  </span>
                </div>

                <span className="text-sm text-white/80">
                  Access to verified doctors
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                  <span className="text-sm">
                    ✓
                  </span>
                </div>

                <span className="text-sm text-white/80">
                  Easy online booking
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
                  <span className="text-sm">
                    ✓
                  </span>
                </div>

                <span className="text-sm text-white/80">
                  Secure and transparent payments
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
                Create Account
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 transition-colors hover:text-blue-500"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <form
              className="space-y-5"
              onSubmit={handleRegister}
            >
              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* =========================
                  FULL NAME
              ========================== */}
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  onBlur={() =>
                    setTouched((current) => ({
                      ...current,
                      fullName: true,
                    }))
                  }
                  className={`w-full rounded-lg border px-4 py-2.5 text-black/80 outline-none transition-colors placeholder:text-black/40 focus:border-transparent focus:ring-2 ${
                    touched.fullName &&
                    fullNameError
                      ? 'border-red-500 focus:ring-red-500'
                      : touched.fullName &&
                        !fullNameError
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter your full name"
                />

                {touched.fullName &&
                  fullNameError && (
                    <p className="mt-1 text-xs text-red-600">
                      {fullNameError}
                    </p>
                  )}
              </div>

              {/* =========================
                  EMAIL
              ========================== */}
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
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  onBlur={() =>
                    setTouched((current) => ({
                      ...current,
                      email: true,
                    }))
                  }
                  className={`w-full rounded-lg border px-4 py-2.5 text-black/80 outline-none transition-colors placeholder:text-black/40 focus:border-transparent focus:ring-2 ${
                    touched.email &&
                    emailError
                      ? 'border-red-500 focus:ring-red-500'
                      : touched.email &&
                        !emailError
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="example@domain.com"
                />

                {touched.email &&
                  emailError && (
                    <p className="mt-1 text-xs text-red-600">
                      {emailError}
                    </p>
                  )}
              </div>

              {/* =========================
                  PASSWORD
              ========================== */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    onBlur={() =>
                      setTouched((current) => ({
                        ...current,
                        password: true,
                      }))
                    }
                    className={`w-full rounded-lg border px-4 py-2.5 pr-12 text-black/80 outline-none transition-colors placeholder:text-black/40 focus:border-transparent focus:ring-2 ${
                      touched.password &&
                      passwordError
                        ? 'border-red-500 focus:ring-red-500'
                        : touched.password &&
                          !passwordError
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Create a password (min 6 characters)"
                  />

                  <button
                    type="button"
                    onClick={
                      togglePasswordVisibility
                    }
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

                {touched.password &&
                  passwordError && (
                    <p className="mt-1 text-xs text-red-600">
                      {passwordError}
                    </p>
                  )}

                {touched.password &&
                  !passwordError &&
                  password.length > 0 && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Password is valid
                    </p>
                  )}
              </div>

              {/* =========================
                  ROLE
              ========================== */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  I am a
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setRole('patient')
                    }
                    className={`flex items-center justify-center rounded-lg border-2 px-4 py-3 transition-all ${
                      role === 'patient'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Patient
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRole('doctor')
                    }
                    className={`flex items-center justify-center rounded-lg border-2 px-4 py-3 transition-all ${
                      role === 'doctor'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Doctor
                  </button>
                </div>

                {role === 'doctor' && (
                  <p className="mt-2 rounded-lg border border-yellow-400 bg-yellow-50 p-2 text-xs text-yellow-700">
                    Doctor accounts require admin
                    approval before you can start
                    accepting patients.
                  </p>
                )}
              </div>

              {/* =========================
                  TERMS
              ========================== */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                <label
                  htmlFor="terms"
                  className="text-xs text-gray-600"
                >
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    className="text-blue-600 hover:underline"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    className="text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* =========================
                  SUBMIT
              ========================== */}
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-2.647z"
                      />
                    </svg>

                    Creating account...
                  </span>
                ) : (
                  'Create Account'
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