// app/doctor/appointments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Clock } from 'lucide-react'

interface Appointment {
  id: string
  starts_at: string
  ends_at: string
  status: 'pending_payment' | 'payment_processing' | 'confirmed' | 'completed' | 'cancelled' | 'expired' | 'payment_failed'
  consultation_type: string
  fee: number
  currency: string
  reason: string
  notes: string
  patient_id: string
  patient: {
    full_name: string
    avatar_url: string | null
    specialty: string
  }
}

export default function DoctorAppointmentsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchAppointments()
    }
  }, [user, authLoading])

  const fetchAppointments = async () => {
    if (!user) return

    setLoading(true)

    try {
      // Step 1: Fetch appointments with patient user data directly
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient_user:patient_id (
            full_name,
            avatar_url
          )
        `)
        .eq('doctor_id', user.id)
        .order('starts_at', { ascending: false })

      if (appointmentsError) throw appointmentsError

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([])
        setLoading(false)
        return
      }

      // Step 2: Get patient profiles (no specialty needed for doctor's view)
      // But we might want to show patient info

      // Step 3: Combine the data
      const combinedData = appointmentsData.map((appointment: any) => {
        const patientUser = appointment.patient_user || {}
        
        return {
          ...appointment,
          patient: {
            full_name: patientUser.full_name || 'Unknown',
            avatar_url: patientUser.avatar_url || null,
            specialty: '', // Not needed for doctor's view
          }
        }
      })

      setAppointments(combinedData)
      console.log('Doctor appointments:', combinedData) // Debug log
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this appointment as ${newStatus}?`)) return

    setUpdating(appointmentId)

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) throw error

      setAppointments(
        appointments.map((app) =>
          app.id === appointmentId ? { ...app, status: newStatus as any } : app
        )
      )
    } catch (error) {
      console.error('Error updating appointment:', error)
      alert('Failed to update appointment status')
    } finally {
      setUpdating(null)
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
    if (filter === 'all') return appointments
    if (filter === 'upcoming') {
      return appointments.filter(
        (app) =>
          (app.status === 'confirmed' || app.status === 'pending_payment') &&
          new Date(app.starts_at) > new Date()
      )
    }
    if (filter === 'past') {
      return appointments.filter(
        (app) =>
          app.status === 'completed' ||
          app.status === 'cancelled' ||
          new Date(app.starts_at) < new Date()
      )
    }
    return appointments.filter((app) => app.status === filter)
  }

  const canUpdate = (appointment: Appointment) => {
    return appointment.status === 'pending_payment' || 
           appointment.status === 'confirmed'
  }

  const canConfirm = (appointment: Appointment) => {
    return appointment.status === 'pending_payment'
  }

  const canComplete = (appointment: Appointment) => {
    return appointment.status === 'confirmed'
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/doctor" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Appointments</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/doctor" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
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
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500">View and manage all your appointments</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'pending_payment', label: 'Pending Payment' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'past', label: 'Past' },
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

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No appointments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const status = getStatusBadge(appointment.status)
              const patientName = appointment.patient?.full_name || 'Unknown'
              const date = new Date(appointment.starts_at)

              return (
                <div
                  key={appointment.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg shrink-0 overflow-hidden">
                        {appointment.patient?.avatar_url ? (
                          <img
                            src={appointment.patient.avatar_url}
                            alt={patientName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          patientName.charAt(0) || 'P'
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {patientName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {appointment.reason || 'General Consultation'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
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
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canConfirm(appointment) && (
                        <button
                          onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                          disabled={updating === appointment.id}
                          className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {updating === appointment.id ? '...' : 'Confirm'}
                        </button>
                      )}
                      {canComplete(appointment) && (
                        <button
                          onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                          disabled={updating === appointment.id}
                          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {updating === appointment.id ? '...' : 'Complete'}
                        </button>
                      )}
                      {canUpdate(appointment) && (
                        <button
                          onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                          disabled={updating === appointment.id}
                          className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {updating === appointment.id ? '...' : 'Cancel'}
                        </button>
                      )}
                      <Link
                        href={`/doctor/appointments/${appointment.id}`}
                        className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View Details
                      </Link>
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