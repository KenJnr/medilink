// app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import {
  Users,
  Stethoscope,
  Calendar,
  CreditCard,
  UserCheck,
  DollarSign,
  User,
} from 'lucide-react'

interface DashboardStats {
  total_users: number
  total_doctors: number
  total_patients: number
  total_appointments: number
  today_appointments: number
  total_revenue: number
}

export default function AdminDashboard() {
  const { user, userRole, loading: authLoading, signOut } = useAuth()
  const supabase = createClient()

  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_doctors: 0,
    total_patients: 0,
    total_appointments: 0,
    today_appointments: 0,
    total_revenue: 0,
  })
  const [loading, setLoading] = useState(true)

  // Fetch stats only once we know the user IS an admin. No redirect here —
  // this effect only ever changes local `stats`/`loading`, never navigates.
  useEffect(() => {
    if (!authLoading && user && userRole === 'admin') {
      fetchStats()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [authLoading, user, userRole])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const { count: totalDoctors } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'doctor')

      const { count: totalPatients } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient')

      const { count: totalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('starts_at', today.toISOString())
        .lt('starts_at', tomorrow.toISOString())

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      setStats({
        total_users: totalUsers || 0,
        total_doctors: totalDoctors || 0,
        total_patients: totalPatients || 0,
        total_appointments: totalAppointments || 0,
        today_appointments: todayAppointments || 0,
        total_revenue: totalRevenue,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- Render-based gating (no router.push anywhere in this file) ---

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-gray-700 font-medium">You need to sign in to view this page.</p>
          <Link href="/login" className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-gray-700 font-medium">You don&apos;t have access to this page.</p>
          <Link href="/" className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const statsCards = [
    { title: 'Total Users', value: stats.total_users, icon: Users, indicatorColor: 'bg-blue-400' },
    { title: 'Total Doctors', value: stats.total_doctors, icon: Stethoscope, indicatorColor: 'bg-emerald-400' },
    { title: 'Total Patients', value: stats.total_patients, icon: User, indicatorColor: 'bg-purple-400' },
    { title: 'Total Appointments', value: stats.total_appointments, icon: Calendar, indicatorColor: 'bg-indigo-400' },
    { title: "Today's Appointments", value: stats.today_appointments, icon: Calendar, indicatorColor: 'bg-yellow-400' },
    { title: 'Total Revenue', value: `GHS ${stats.total_revenue.toFixed(2)}`, icon: DollarSign, indicatorColor: 'bg-teal-400' },
  ]

  const quickActions = [
    { title: 'Manage Doctors', href: '/admin/doctors', icon: UserCheck },
    { title: 'View Users', href: '/admin/users', icon: Users },
    { title: 'All Appointments', href: '/admin/appointments', icon: Calendar },
    { title: 'Payments', href: '/admin/payments', icon: CreditCard },
    { title: 'Profile', href: '/admin/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Admin</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                  {user.full_name?.charAt(0) || 'A'}
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">{user.full_name || 'Admin'}</span>
              </div>
              <button onClick={() => signOut()} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of the entire platform</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {statsCards.map((card) => (
            <div
              key={card.title}
              className="bg-linear-to-br from-blue-700 to-blue-500 rounded-xl px-4 py-6 shadow-sm relative overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full">
                <div className={`w-full h-full rounded-full ${card.indicatorColor}`} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/70">{card.title}</p>
                  <card.icon className="w-4 h-4 text-white/60" />
                </div>
                <p className="text-xl font-medium text-white mt-1">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <action.icon className="w-6 h-6 text-gray-600" />
                <span className="text-sm text-gray-700 text-center">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}