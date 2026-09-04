// app/admin/appointments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Stethoscope, Search } from 'lucide-react'

interface Appointment {
  id: string
  starts_at: string
  status: string
  fee: number
  currency: string
  reason: string
  patient_name: string
  doctor_name: string
  specialty: string
}

export default function AdminAppointmentsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

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
      fetchAppointments()
    }
  }, [user, userRole, authLoading, filter])

  const fetchAppointments = async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient_user:patient_id (
            full_name
          ),
          doctor_user:doctor_id (
            full_name
          )
        `)
        .order('starts_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      const mapped: Appointment[] = data?.map((app: any) => ({
        id: app.id,
        starts_at: app.starts_at,
        status: app.status,
        fee: app.fee || 0,
        currency: app.currency || 'GHS',
        reason: app.reason || 'General consultation',
        patient_name: app.patient_user?.full_name || 'Unknown Patient',
        doctor_name: app.doctor_user?.full_name || 'Unknown Doctor',
        specialty: app.specialty || 'General Medicine',
      })) || []

      setAppointments(mapped)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-700 border border-green-200',
      pending_payment: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      payment_processing: 'bg-blue-100 text-blue-700 border border-blue-200',
      completed: 'bg-gray-100 text-gray-700 border border-gray-200',
      cancelled: 'bg-red-100 text-red-700 border border-red-200',
      expired: 'bg-gray-100 text-gray-500 border border-gray-200',
      payment_failed: 'bg-red-100 text-red-700 border border-red-200',
    }
    const labels: Record<string, string> = {
      confirmed: 'Confirmed',
      pending_payment: 'Pending Payment',
      payment_processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
      payment_failed: 'Payment Failed',
    }
    return {
      className: styles[status] || 'bg-gray-100 text-gray-700 border border-gray-200',
      label: labels[status] || status,
    }
  }

  const getFilteredAppointments = () => {
    if (!searchTerm) return appointments
    return appointments.filter(
      (app) =>
        app.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredAppointments = getFilteredAppointments()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading appointments...</p>
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
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Appointments</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500 mt-1">View all appointments on the platform</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-64 placeholder-gray-400 text-gray-700"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending_payment', label: 'Pending Payment' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
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

        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No appointments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((app) => {
              const status = getStatusBadge(app.status)
              const date = new Date(app.starts_at)

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{app.patient_name}</span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{app.doctor_name}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{app.reason}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {date.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                        <span className="font-medium text-gray-700">
                          {app.currency} {app.fee}
                        </span>
                      </div>
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