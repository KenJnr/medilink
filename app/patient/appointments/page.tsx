// app/patient/appointments/page.tsx
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
  doctor_id: string
  doctor: {
    full_name: string
    avatar_url: string | null
    specialty: string
  }
}

export default function PatientAppointmentsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [cancelling, setCancelling] = useState<string | null>(null)

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
      // Step 1: Fetch appointments with doctor user data directly
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_user:doctor_id (
            full_name,
            avatar_url
          )
        `)
        .eq('patient_id', user.id)
        .order('starts_at', { ascending: false })

      if (appointmentsError) throw appointmentsError

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([])
        setLoading(false)
        return
      }

      // Step 2: Get doctor profiles to fetch specialties
      const doctorIds = appointmentsData.map((app: any) => app.doctor_id)
      
      // Use a simpler query without nested joins
      const { data: doctorProfiles, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialty_id')
        .in('user_id', doctorIds)

      if (doctorError) throw doctorError

      // Step 3: Fetch specialties separately
      const specialtyIds = doctorProfiles?.map((dp: any) => dp.specialty_id).filter(Boolean) || []
      let specialtiesMap: Record<string, string> = {}
      
      if (specialtyIds.length > 0) {
        const { data: specialties, error: specialtyError } = await supabase
          .from('specialties')
          .select('id, name')
          .in('id', specialtyIds)

        if (!specialtyError && specialties) {
          specialtiesMap = specialties.reduce((acc: Record<string, string>, s: any) => {
            acc[s.id] = s.name
            return acc
          }, {})
        }
      }

      // Step 4: Build a map of user_id to specialty name
      const userSpecialtyMap: Record<string, string> = {}
      doctorProfiles?.forEach((dp: any) => {
        if (dp.user_id && dp.specialty_id) {
          userSpecialtyMap[dp.user_id] = specialtiesMap[dp.specialty_id] || 'General Medicine'
        }
      })

      // Step 5: Combine the data
      const combinedData = appointmentsData.map((appointment: any) => {
        const doctorUser = appointment.doctor_user || {}
        
        return {
          ...appointment,
          doctor: {
            full_name: doctorUser.full_name || 'Unknown',
            avatar_url: doctorUser.avatar_url || null,
            specialty: userSpecialtyMap[appointment.doctor_id] || 'General Medicine',
          }
        }
      })

      setAppointments(combinedData)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    setCancelling(appointmentId)

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) throw error

      setAppointments(
        appointments.map((app) =>
          app.id === appointmentId ? { ...app, status: 'cancelled' } : app
        )
      )
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Failed to cancel appointment. Please try again.')
    } finally {
      setCancelling(null)
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

  const canCancel = (appointment: Appointment) => {
    return (
      appointment.status === 'pending_payment' ||
      appointment.status === 'confirmed'
    )
  }

  const canPay = (appointment: Appointment) => {
    return appointment.status === 'pending_payment'
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
              <Link href="/" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">My Appointments</span>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
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
            <Link
              href="/doctors"
              className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Find a doctor →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const status = getStatusBadge(appointment.status)
              const doctorName = appointment.doctor?.full_name || 'Unknown'
              const specialty = appointment.doctor?.specialty || 'General Medicine'
              const date = new Date(appointment.starts_at)

              return (
                <div
                  key={appointment.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg flex-shrink-0 overflow-hidden">
                        {appointment.doctor?.avatar_url ? (
                          <img
                            src={appointment.doctor.avatar_url}
                            alt={doctorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          doctorName.charAt(0) || 'D'
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Dr. {doctorName}
                        </h3>
                        <p className="text-sm text-gray-500">{specialty}</p>
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
                      {canPay(appointment) && (
                        <Link
                          href={`/patient/payments`}
                          className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Pay Now
                        </Link>
                      )}
                      {canCancel(appointment) && (
                        <button
                          onClick={() => handleCancelAppointment(appointment.id)}
                          disabled={cancelling === appointment.id}
                          className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {cancelling === appointment.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      <Link
                        href={`/patient/appointments/${appointment.id}`}
                        className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Details
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