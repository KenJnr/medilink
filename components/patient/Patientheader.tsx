// components/patient/PatientHeader.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { useState } from 'react'

interface PatientHeaderProps {
  fullName?: string
  avatarUrl?: string | null
}

export default function PatientHeader({ fullName, avatarUrl }: PatientHeaderProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [imageError, setImageError] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/'
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'P'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(fullName || 'Patient')
  const displayName = fullName?.split(' ')[0] || 'Patient'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              MediLink
            </Link>
            <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Patient</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm overflow-hidden bg-blue-100 flex-shrink-0">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || 'User'}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span className="text-sm text-gray-700 hidden sm:block">
                {displayName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}