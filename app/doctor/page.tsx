// app/doctor/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  CheckCircle,
  DollarSign,
  User,
  CalendarDays,
  Users,
  Search,
  Edit,
} from 'lucide-react'

interface DoctorProfile {
  id: string
  user_id: string
  specialty_id: string
  bio: string
  qualifications: string[]
  experience_years: number
  consultation_fee: number
  currency: string
  location: string
  consultation_type: string
  profile_image: string
  approval_status: string
  specialties: {
    name: string
  }
}

interface Appointment {
  id: string
  starts_at: string
  ends_at: string
  status: string
  patient_id: string
  consultation_type: string
  fee: number
  currency: string
  reason: string
  users: {
    full_name: string
    email: string
    phone: string
  }
}

export default function DoctorDashboard() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    completed: 0,
    totalEarnings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && !authLoading) {
      fetchDoctorData()
    }
  }, [user, authLoading])

  const fetchDoctorData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('doctor_profiles')
        .select(`
          *,
          specialties:specialty_id (
            name
          )
        `)
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        
        if (profileError.code === 'PGRST116') {
          console.log('No profile found, creating one...')
          
          const { data: newProfile, error: createError } = await supabase
            .from('doctor_profiles')
            .insert({
              user_id: user.id,
              consultation_fee: 0,
              approval_status: 'pending',
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
            setError('Failed to create profile. Please try again.')
            setLoading(false)
            return
          }

          if (newProfile) {
            setDoctorProfile({
              ...newProfile,
              specialties: { name: 'Not set' }
            })
          }
        } else if (profileError.code === '42501') {
          setError('Permission denied. Please contact support.')
          setLoading(false)
          return
        } else {
          setError('Failed to load profile. Please try again.')
          setLoading(false)
          return
        }
      } else {
        setDoctorProfile(profileData)
      }

      // Only fetch appointments if doctor is approved
      if (doctorProfile?.approval_status === 'active') {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            users:patient_id (
              full_name,
              email,
              phone
            )
          `)
          .eq('doctor_id', user.id)
          .order('starts_at', { ascending: true })

        if (!appointmentsError && appointmentsData) {
          setAppointments(appointmentsData)

          const now = new Date()
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const todayAppointments = appointmentsData.filter(
            (app) => new Date(app.starts_at) >= today && new Date(app.starts_at) < new Date(today.getTime() + 86400000)
          )

          const upcomingAppointments = appointmentsData.filter(
            (app) => 
              (app.status === 'confirmed' || app.status === 'pending_payment') &&
              new Date(app.starts_at) > now
          )

          const completedAppointments = appointmentsData.filter(
            (app) => app.status === 'completed'
          )

          const totalEarnings = completedAppointments.reduce(
            (sum, app) => sum + (app.fee || 0),
            0
          )

          setStats({
            today: todayAppointments.length,
            upcoming: upcomingAppointments.length,
            completed: completedAppointments.length,
            totalEarnings: totalEarnings,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isPending = doctorProfile?.approval_status === 'pending'

  if (!user && !authLoading) {
    return null
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-green-50 text-green-700',
      pending_payment: 'bg-yellow-50 text-yellow-700',
      completed: 'bg-gray-50 text-gray-700',
      cancelled: 'bg-red-50 text-red-700',
      payment_processing: 'bg-blue-50 text-blue-700',
    }
    const labels: Record<string, string> = {
      confirmed: 'Confirmed',
      pending_payment: 'Pending Payment',
      completed: 'Completed',
      cancelled: 'Cancelled',
      payment_processing: 'Processing',
    }
    return {
      className: styles[status] || 'bg-gray-50 text-gray-700',
      label: labels[status] || status,
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Doctor Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                  {user?.full_name?.charAt(0) || 'D'}
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">
                  Dr. {user?.full_name?.split(' ')[0] || 'Doctor'}
                </span>
                {doctorProfile?.approval_status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    doctorProfile.approval_status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doctorProfile.approval_status === 'active' ? 'Active' : 'Pending'}
                  </span>
                )}
              </div>
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
        {/* Pending Notice */}
        {isPending && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-700">
               Your account is pending admin approval. 
              You can set up your profile and schedule while you wait.
              Patients will not be able to book with you until approved.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, Dr. {user?.full_name?.split(' ')[0] || 'Doctor'} 
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isPending 
              ? 'Complete your profile to get approved and start seeing patients.'
              : "Here's a summary of your practice."}
          </p>
        </div>

        {/* Stats Cards - Same as Patient Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="bg-gradient-to-br from-blue-700 to-blue-500 relative rounded-xl px-4 py-3.5 shadow-sm overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full ">
            <div className="w-full h-full rounded-full bg-blue-500" />
          </div>
            <p className="text-xs text-white/70 mb-1">Today's Appointments</p>
            <p className="text-xl font-medium text-white">{stats.today}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-700 to-blue-500 relative rounded-xl px-4 py-3.5 shadow-sm overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full ">
            <div className="w-full h-full rounded-full bg-amber-500" />
          </div>
            <p className="text-xs text-white/70 mb-1">Upcoming</p>
            <p className="text-xl font-medium text-white">{stats.upcoming}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-700 to-blue-500 relative rounded-xl px-4 py-3.5 shadow-sm overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full ">
            <div className="w-full h-full rounded-full bg-emerald-500" />
          </div>
            <p className="text-xs text-white/70 mb-1">Completed</p>
            <p className="text-xl font-medium text-white">{stats.completed}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-700 to-blue-500 relative rounded-xl px-4 py-3.5 shadow-sm overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full ">
            <div className="w-full h-full rounded-full bg-purple-400" />
          </div>
            <p className="text-xs text-white/70 mb-1">Total Earnings</p>
            <p className="text-xl font-medium text-white">
              {doctorProfile?.currency || 'GHS'} {stats.totalEarnings.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/doctor/profile"
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
          >
            <Edit className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Edit Profile</p>
          </Link>
          <Link
            href="/doctor/schedule"
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
          >
            <CalendarDays className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Manage Schedule</p>
          </Link>
          <Link
            href="/doctor/appointments"
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
          >
            <Calendar className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">View Appointments</p>
          </Link>
        </div>

        {/* Upcoming Appointments - Only show if approved */}
        {!isPending && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-900">Upcoming Appointments</h2>
              <Link 
                href="/doctor/appointments" 
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                View all →
              </Link>
            </div>

            <div className="p-4">
              {appointments.filter(
                (app) => 
                  (app.status === 'confirmed' || app.status === 'pending_payment') &&
                  new Date(app.starts_at) > new Date()
              ).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No upcoming appointments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments
                    .filter(
                      (app) => 
                        (app.status === 'confirmed' || app.status === 'pending_payment') &&
                        new Date(app.starts_at) > new Date()
                    )
                    .slice(0, 5)
                    .map((appointment) => {
                      const status = getStatusBadge(appointment.status)
                      return (
                        <div
                          key={appointment.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3"
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {appointment.users?.full_name || 'Unknown Patient'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {appointment.reason || 'General Consultation'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                               {new Date(appointment.starts_at).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })} · {new Date(appointment.starts_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                            <Link
                              href={`/doctor/appointments/${appointment.id}`}
                              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending State - Show Setup Guide */}
        {isPending && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Get Started</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">1</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Complete Your Profile</p>
                  <p className="text-xs text-gray-500">Add your specialty, bio, qualifications, and consultation fee</p>
                </div>
                <Link href="/doctor/profile" className="ml-auto text-sm text-blue-600 hover:text-blue-800">
                  Go →
                </Link>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Set Your Schedule</p>
                  <p className="text-xs text-gray-500">Define your working hours and availability</p>
                </div>
                <Link href="/doctor/schedule" className="ml-auto text-sm text-blue-600 hover:text-blue-800">
                  Go →
                </Link>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Wait for Approval</p>
                  <p className="text-xs text-gray-500">Admin will review and approve your profile</p>
                </div>
                <span className="ml-auto text-sm text-gray-400">Pending</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}