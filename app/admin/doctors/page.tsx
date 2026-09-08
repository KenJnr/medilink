// app/admin/doctors/page.tsx
'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, Eye, UserCheck, UserX, Clock, Search, MoreVertical, UserMinus, UserPlus } from 'lucide-react'

interface Doctor {
  id: string
  user_id: string
  full_name: string
  email: string
  specialty_name: string
  consultation_fee: number
  currency: string
  location: string
  approval_status: string
  created_at: string
}

// Separate component that uses useSearchParams
function DoctorsContent() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && userRole !== 'admin') {
      router.push('/unauthorized')
      return
    }
    if (user && userRole === 'admin') {
      fetchDoctors()
    }
  }, [user, userRole, authLoading, filter])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchDoctors = async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('doctor_profiles')
        .select(`
          *,
          users:user_id (
            full_name,
            email
          ),
          specialties:specialty_id (
            name
          )
        `)

      if (filter === 'pending') {
        query = query.eq('approval_status', 'pending')
      } else if (filter === 'approved') {
        query = query.eq('approval_status', 'active')
      } else if (filter === 'rejected') {
        query = query.eq('approval_status', 'rejected')
      } else if (filter === 'suspended') {
        // We'll filter users with suspended status
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const mappedDoctors: Doctor[] = data?.map((doc: any) => ({
        id: doc.id,
        user_id: doc.user_id,
        full_name: doc.users?.full_name || 'Unknown',
        email: doc.users?.email || '',
        specialty_name: doc.specialties?.name || 'General Medicine',
        consultation_fee: doc.consultation_fee || 0,
        currency: doc.currency || 'GHS',
        location: doc.location || '',
        approval_status: doc.approval_status || 'pending',
        created_at: doc.created_at,
      })) || []

      // If filter is suspended, filter doctors whose users are suspended
      if (filter === 'suspended') {
        const { data: suspendedUsers } = await supabase
          .from('users')
          .select('id')
          .eq('status', 'suspended')
        
        const suspendedIds = new Set(suspendedUsers?.map(u => u.id) || [])
        setDoctors(mappedDoctors.filter(d => suspendedIds.has(d.user_id)))
      } else {
        setDoctors(mappedDoctors)
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (doctorId: string, status: 'active' | 'rejected' | 'suspended') => {
    setProcessing(doctorId)
    setOpenDropdown(null)

    try {
      const doctor = doctors.find(d => d.id === doctorId)
      if (!doctor) return

      // Update doctor profile approval status
      let profileStatus = status
      if (status === 'suspended') {
        profileStatus = 'active' // Keep profile active but user suspended
      }

      const { error } = await supabase
        .from('doctor_profiles')
        .update({ approval_status: profileStatus })
        .eq('id', doctorId)

      if (error) throw error

      // Update user status
      let userStatus = status === 'active' ? 'active' : status === 'suspended' ? 'suspended' : 'suspended'
      await supabase
        .from('users')
        .update({ status: userStatus })
        .eq('id', doctor.user_id)

      await fetchDoctors()
    } catch (error) {
      console.error('Error updating doctor:', error)
      alert('Failed to update doctor status')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string, userId: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border border-green-200',
      pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      rejected: 'bg-red-100 text-red-700 border border-red-200',
      suspended: 'bg-orange-100 text-orange-700 border border-orange-200',
    }
    const labels: Record<string, string> = {
      active: 'Approved',
      pending: 'Pending',
      rejected: 'Rejected',
      suspended: 'Suspended',
    }
    return {
      className: styles[status] || 'bg-gray-100 text-gray-700 border border-gray-200',
      label: labels[status] || status,
    }
  }

  const getFilteredDoctors = () => {
    if (!searchTerm) return doctors
    return doctors.filter(
      (doc) =>
        doc.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialty_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredDoctors = getFilteredDoctors()

  const getAvailableActions = (doctor: Doctor) => {
    const actions = []
    
    if (doctor.approval_status === 'pending') {
      actions.push({ label: 'Approve', value: 'active', icon: Check, color: 'text-green-600 hover:bg-green-50' })
      actions.push({ label: 'Reject', value: 'rejected', icon: X, color: 'text-red-600 hover:bg-red-50' })
    } else if (doctor.approval_status === 'active') {
      actions.push({ label: 'Suspend', value: 'suspended', icon: UserMinus, color: 'text-orange-600 hover:bg-orange-50' })
    } else if (doctor.approval_status === 'rejected') {
      actions.push({ label: 'Approve', value: 'active', icon: UserPlus, color: 'text-green-600 hover:bg-green-50' })
    } else if (doctor.approval_status === 'suspended') {
      actions.push({ label: 'Activate', value: 'active', icon: UserPlus, color: 'text-green-600 hover:bg-green-50' })
    }
    
    return actions
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading doctors...</p>
        </div>
      </div>
    )
  }

  if (!user || userRole !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Manage Doctors</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Doctors</h1>
            <p className="text-sm text-gray-500 mt-1">Approve, reject, or suspend doctor accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-48 placeholder-gray-400 text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'suspended', label: 'Suspended' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Doctors List */}
        {filteredDoctors.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No doctors found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDoctors.map((doctor) => {
              const status = getStatusBadge(doctor.approval_status, doctor.id)
              const actions = getAvailableActions(doctor)
              const isDropdownOpen = openDropdown === doctor.id

              return (
                <div
                  key={doctor.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 text-lg">
                        Dr. {doctor.full_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{doctor.specialty_name}</span>
                        <span>•</span>
                        <span>{doctor.location || 'Location not set'}</span>
                        <span>•</span>
                        <span>{doctor.currency} {doctor.consultation_fee}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{doctor.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>

                      {/* Vertical 3-dot dropdown */}
                      {actions.length > 0 && (
                        <div className="relative" ref={dropdownRef}>
                          <button
                            onClick={() => setOpenDropdown(isDropdownOpen ? null : doctor.id)}
                            disabled={processing === doctor.id}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              {actions.map((action) => (
                                <button
                                  key={action.value}
                                  onClick={() => handleApproval(doctor.id, action.value as any)}
                                  disabled={processing === doctor.id}
                                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${action.color}`}
                                >
                                  <action.icon className="w-4 h-4" />
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

// Main export wrapped with Suspense
export default function AdminDoctorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading doctors...</p>
        </div>
      </div>
    }>
      <DoctorsContent />
    </Suspense>
  )
}