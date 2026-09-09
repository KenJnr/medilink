// app/admin/doctors/page.tsx
'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, Eye, UserCheck, UserX, Clock, Search, MoreVertical, UserMinus, UserPlus, FileText } from 'lucide-react'

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
  documents_uploaded: boolean
  document_status: string
  license_document: string | null
  id_document: string | null
  qualification_document: string | null
  avatar_url: string | null
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
  const [viewingDocuments, setViewingDocuments] = useState<string | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

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
      console.log('=== FETCHING DOCTORS ===')

      // Get all doctor profiles with user info including avatar
      const { data: profiles, error: profilesError } = await supabase
        .from('doctor_profiles')
        .select(`
          *,
          users:user_id (
            full_name,
            email,
            avatar_url
          ),
          specialties:specialty_id (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error fetching doctor profiles:', profilesError)
        setLoading(false)
        return
      }

      console.log('Raw profiles data:', profiles)
      console.log('Number of profiles:', profiles?.length || 0)

      if (!profiles || profiles.length === 0) {
        console.log('No doctor profiles found')
        setDoctors([])
        setLoading(false)
        return
      }

      // Map the data
      const mappedDoctors: Doctor[] = profiles.map((profile: any) => {
        // Get user data
        let userData = { full_name: 'Unknown', email: '', avatar_url: null }
        if (profile.users) {
          if (Array.isArray(profile.users) && profile.users.length > 0) {
            userData = profile.users[0] || { full_name: 'Unknown', email: '', avatar_url: null }
          } else {
            userData = profile.users || { full_name: 'Unknown', email: '', avatar_url: null }
          }
        }

        // Get specialty data
        let specialtyName = 'General Medicine'
        if (profile.specialties) {
          if (Array.isArray(profile.specialties) && profile.specialties.length > 0) {
            specialtyName = profile.specialties[0]?.name || 'General Medicine'
          } else {
            specialtyName = profile.specialties?.name || 'General Medicine'
          }
        }

        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: userData.full_name || 'Unknown',
          email: userData.email || '',
          avatar_url: userData.avatar_url || null,
          specialty_name: specialtyName,
          consultation_fee: profile.consultation_fee || 0,
          currency: profile.currency || 'GHS',
          location: profile.location || '',
          approval_status: profile.approval_status || 'pending',
          created_at: profile.created_at,
          documents_uploaded: profile.documents_uploaded || false,
          document_status: profile.document_status || 'pending',
          license_document: profile.license_document || null,
          id_document: profile.id_document || null,
          qualification_document: profile.qualification_document || null,
        }
      })

      console.log('Mapped doctors:', mappedDoctors)

      // Apply filter
      let filtered = mappedDoctors
      if (filter === 'pending') {
        filtered = mappedDoctors.filter(d => d.approval_status === 'pending')
      } else if (filter === 'approved') {
        filtered = mappedDoctors.filter(d => d.approval_status === 'active')
      } else if (filter === 'rejected') {
        filtered = mappedDoctors.filter(d => d.approval_status === 'rejected')
      } else if (filter === 'suspended') {
        const { data: suspendedUsers } = await supabase
          .from('users')
          .select('id')
          .eq('status', 'suspended')
        
        const suspendedIds = new Set(suspendedUsers?.map(u => u.id) || [])
        filtered = mappedDoctors.filter(d => suspendedIds.has(d.user_id))
      }

      setDoctors(filtered)
      console.log('Final filtered doctors:', filtered.length)

    } catch (error) {
      console.error('Error in fetchDoctors:', error)
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
        profileStatus = 'active'
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

  const getStatusBadge = (status: string) => {
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

  const openDocumentModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setViewingDocuments(doctor.id)
  }

  const closeDocumentModal = () => {
    setViewingDocuments(null)
    setSelectedDoctor(null)
  }

  // Get avatar initials
  const getInitials = (name: string) => {
    if (!name) return 'D'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
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
            <p className="text-sm text-gray-400 mt-2">
              {filter === 'pending' ? 'No pending doctor applications.' : 'Try checking the Pending tab.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDoctors.map((doctor) => {
              const status = getStatusBadge(doctor.approval_status)
              const actions = getAvailableActions(doctor)
              const isDropdownOpen = openDropdown === doctor.id
              const hasDocuments = doctor.documents_uploaded
              const initials = getInitials(doctor.full_name)
              const avatarUrl = doctor.avatar_url

              return (
                <div
                  key={doctor.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg flex-shrink-0 overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={doctor.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>

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
                          {hasDocuments && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              📄 Documents
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{doctor.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>

                      {/* Review Documents Button */}
                      {hasDocuments && (
                        <button
                          onClick={() => openDocumentModal(doctor)}
                          className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          Review Docs
                        </button>
                      )}

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

      {/* Document Review Modal */}
      {viewingDocuments && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDocumentModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Document Review - Dr. {selectedDoctor.full_name}
              </h2>
              <button
                onClick={closeDocumentModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg flex-shrink-0 overflow-hidden">
                    {selectedDoctor.avatar_url ? (
                      <img
                        src={selectedDoctor.avatar_url}
                        alt={selectedDoctor.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(selectedDoctor.full_name)
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Dr. {selectedDoctor.full_name}</p>
                    <p className="text-sm text-gray-600">{selectedDoctor.email}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Specialty: <span className="font-medium">{selectedDoctor.specialty_name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Status: <span className={`font-medium ${getStatusBadge(selectedDoctor.approval_status).className}`}>
                    {getStatusBadge(selectedDoctor.approval_status).label}
                  </span>
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Uploaded Documents</h3>
                <div className="space-y-3">
                  {selectedDoctor.license_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Medical License</p>
                          <p className="text-xs text-gray-500">Uploaded for verification</p>
                        </div>
                      </div>
                      <a
                        href={selectedDoctor.license_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View
                      </a>
                    </div>
                  )}

                  {selectedDoctor.id_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Government ID / Passport</p>
                          <p className="text-xs text-gray-500">Uploaded for verification</p>
                        </div>
                      </div>
                      <a
                        href={selectedDoctor.id_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View
                      </a>
                    </div>
                  )}

                  {selectedDoctor.qualification_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Qualification Certificate</p>
                          <p className="text-xs text-gray-500">Uploaded for verification</p>
                        </div>
                      </div>
                      <a
                        href={selectedDoctor.qualification_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View
                      </a>
                    </div>
                  )}

                  {!selectedDoctor.license_document && 
                   !selectedDoctor.id_document && 
                   !selectedDoctor.qualification_document && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No documents uploaded by this doctor.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 flex gap-3">
                <button
                  onClick={() => {
                    handleApproval(selectedDoctor.id, 'active')
                    closeDocumentModal()
                  }}
                  className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  Approve Doctor
                </button>
                <button
                  onClick={() => {
                    handleApproval(selectedDoctor.id, 'rejected')
                    closeDocumentModal()
                  }}
                  className="flex-1 px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Reject
                </button>
                <button
                  onClick={closeDocumentModal}
                  className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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