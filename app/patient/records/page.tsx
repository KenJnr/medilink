// app/patient/records/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, FileText, Download, ChevronRight, Stethoscope, Pill, Microscope } from 'lucide-react'

interface AppointmentRecord {
  id: string
  starts_at: string
  status: string
  reason: string
  notes: string
  consultation_type: string
  fee: number
  currency: string
  doctor: {
    full_name: string
    specialty: string
    avatar_url: string | null
  }
}

export default function RecordsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [records, setRecords] = useState<AppointmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState<AppointmentRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchRecords()
    }
  }, [user, authLoading])

  const fetchRecords = async () => {
    if (!user) return

    setLoading(true)

    try {
      // Fetch completed appointments
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_user:doctor_id (
            full_name,
            avatar_url
          )
        `)
        .eq('patient_id', user.id)
        .in('status', ['completed', 'confirmed'])
        .order('starts_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        setRecords([])
        setLoading(false)
        return
      }

      // Get doctor profiles for specialties
      const doctorIds = data.map((app: any) => app.doctor_id)
      
      const { data: profiles, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialty_id')
        .in('user_id', doctorIds)

      if (profileError) throw profileError

      // Get specialties
      const specialtyIds = profiles?.map((p: any) => p.specialty_id).filter(Boolean) || []
      let specialtiesMap: Record<string, string> = {}
      
      if (specialtyIds.length > 0) {
        const { data: specialties, error: specError } = await supabase
          .from('specialties')
          .select('id, name')
          .in('id', specialtyIds)

        if (!specError && specialties) {
          specialtiesMap = specialties.reduce((acc: Record<string, string>, s: any) => {
            acc[s.id] = s.name
            return acc
          }, {})
        }
      }

      const profileMap = profiles?.reduce((acc: Record<string, any>, p: any) => {
        acc[p.user_id] = {
          specialty: specialtiesMap[p.specialty_id] || 'General Medicine',
        }
        return acc
      }, {})

      const transformedData: AppointmentRecord[] = data.map((app: any) => {
        const doctorUser = app.doctor_user || {}
        
        return {
          id: app.id,
          starts_at: app.starts_at,
          status: app.status,
          reason: app.reason || 'General consultation',
          notes: app.notes || 'No notes available',
          consultation_type: app.consultation_type || 'in_person',
          fee: app.fee || 0,
          currency: app.currency || 'GHS',
          doctor: {
            full_name: doctorUser.full_name || 'Unknown',
            specialty: profileMap[app.doctor_id]?.specialty || 'General Medicine',
            avatar_url: doctorUser.avatar_url || null,
          }
        }
      })

      setRecords(transformedData)
    } catch (error) {
      console.error('Error fetching records:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredRecords = () => {
    if (filter === 'all') return records
    if (filter === 'completed') return records.filter(r => r.status === 'completed')
    if (filter === 'confirmed') return records.filter(r => r.status === 'confirmed')
    return records
  }

  const handleViewDetails = (record: AppointmentRecord) => {
    setSelectedRecord(record)
    setShowDetail(true)
  }

  const handleDownload = (record: AppointmentRecord) => {
    // Simple text download for now
    const content = `
MEDICAL RECORD
==============
Patient: ${user?.full_name || 'Unknown'}
Date: ${new Date(record.starts_at).toLocaleDateString()}
Doctor: Dr. ${record.doctor.full_name}
Specialty: ${record.doctor.specialty}
Reason: ${record.reason}
Notes: ${record.notes}
Consultation Type: ${record.consultation_type}
Fee: ${record.currency} ${record.fee}
Status: ${record.status}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medical-record-${record.id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading records...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const filteredRecords = getFilteredRecords()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Medical Records</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/patient" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-sm text-gray-500">View and manage your medical history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Visits</p>
            <p className="text-2xl font-bold text-gray-900">{records.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {records.filter(r => r.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600">
              {records.filter(r => r.status === 'confirmed').length}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'completed', label: 'Completed' },
            { value: 'confirmed', label: 'Upcoming' },
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

        {/* Records List */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No medical records found</p>
            <Link
              href="/doctors"
              className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Book your first appointment →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg flex-shrink-0 overflow-hidden">
                      {record.doctor.avatar_url ? (
                        <img src={record.doctor.avatar_url} alt={record.doctor.full_name} className="w-full h-full object-cover" />
                      ) : (
                        record.doctor.full_name?.charAt(0) || 'D'
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Dr. {record.doctor.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">{record.doctor.specialty}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(record.starts_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(record.starts_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {record.status === 'completed' ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(record)}
                      className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      View Details
                    </button>
                    {record.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(record)}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4 inline mr-1" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Record Detail Modal */}
        {selectedRecord && showDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Medical Record</h2>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl text-blue-600 overflow-hidden">
                    {selectedRecord.doctor.avatar_url ? (
                      <img src={selectedRecord.doctor.avatar_url} alt={selectedRecord.doctor.full_name} className="w-full h-full object-cover" />
                    ) : (
                      selectedRecord.doctor.full_name?.charAt(0) || 'D'
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      Dr. {selectedRecord.doctor.full_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedRecord.doctor.specialty}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedRecord.starts_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedRecord.starts_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className={`font-medium ${
                      selectedRecord.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {selectedRecord.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Consultation Type</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedRecord.consultation_type?.replace('_', ' ') || 'In-Person'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Reason for Visit</p>
                  <p className="text-gray-900">{selectedRecord.reason}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Consultation Notes</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRecord.notes}</p>
                </div>

                <div className="pt-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => setShowDetail(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  {selectedRecord.status === 'completed' && (
                    <button
                      onClick={() => handleDownload(selectedRecord)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4 inline mr-1" />
                      Download Record
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}