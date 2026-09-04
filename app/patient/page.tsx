// app/patient/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import PatientHeader from '@/components/patient/Patientheader'
import StatsCards from '@/components/patient/Statscards'
import UpcomingAppointments from '@/components/patient/Upcomingappointments'
import QuickActions from '@/components/patient/Quickactions'
import RecommendedDoctors from '@/components/patient/Recommendeddoctors'
import HealthTip from '@/components/patient/Healthtip'
import RecentActivity from '@/components/patient/Recentactivity'
import type { User, Appointment, Doctor, DashboardStats } from '@/lib/types/patient-dashboard'

export default function PatientDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([])
  const [recommendedDoctors, setRecommendedDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    setUser(userData)

    const { data: appointments } = await supabase
      .from('appointments')
      .select(
        `
        *,
        doctor_profiles:doctor_id (
          id,
          users:user_id (
            full_name
          ),
          specialties:specialty_id (
            name
          ),
          consultation_fee
        )
      `
      )
      .eq('patient_id', authUser.id)
      .order('starts_at', { ascending: true })

    if (appointments) {
      const now = new Date()
      
      // Filter confirmed appointments (future)
      const confirmed = appointments.filter(
        (app) =>
          app.status === 'confirmed' &&
          new Date(app.starts_at) > now
      )
      setUpcomingAppointments(confirmed.slice(0, 4))

      // Filter completed appointments
      const completed = appointments.filter((app) => app.status === 'completed')
      setRecentAppointments(completed.slice(0, 3))

      // Calculate stats
      const pending = appointments.filter((app) => app.status === 'pending_payment')
      const cancelled = appointments.filter((app) => app.status === 'cancelled')

      setStats({
        confirmed: confirmed.length,
        pending: pending.length,
        completed: completed.length,
        cancelled: cancelled.length,
        total: appointments.length,
      })
    }

    const { data: doctors } = await supabase
      .from('doctor_profiles')
      .select(
        `
        id,
        user_id,
        users:user_id (
          full_name
        ),
        specialties:specialty_id (
          name
        ),
        consultation_fee,
        currency,
        location
      `
      )
      .eq('approval_status', 'active')
      .limit(3)

    if (doctors) {
      const mappedDoctors: Doctor[] = doctors.map((doc: any) => ({
        id: doc.id,
        full_name: doc.users?.full_name || 'Unknown',
        specialty_name: doc.specialties?.name || 'General Medicine',
        consultation_fee: doc.consultation_fee || 0,
        currency: doc.currency || 'GHS',
        location: doc.location || '',
      }))
      setRecommendedDoctors(mappedDoctors)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PatientHeader fullName={user?.full_name} avatarUrl={user?.avatar_url} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back, {user?.full_name?.split(' ')[0] || 'Patient'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Here&apos;s a summary of your healthcare journey.
              </p>
            </div>
            <Link
              href="/doctors"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center whitespace-nowrap shadow-sm"
            >
              Find a doctor
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <UpcomingAppointments appointments={upcomingAppointments} />
            <QuickActions />
          </div>

          <div className="space-y-6">
            <RecommendedDoctors doctors={recommendedDoctors} />
            <HealthTip />
            <RecentActivity appointments={recentAppointments} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} MediLink. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}