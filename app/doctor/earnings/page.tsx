// app/doctor/earnings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DollarSign, Calendar, TrendingUp, ArrowLeft } from 'lucide-react'

interface EarningsData {
  total: number
  monthly: {
    month: string
    amount: number
  }[]
  appointments: {
    id: string
    starts_at: string
    fee: number
    currency: string
    patient_name: string
  }[]
}

export default function DoctorEarningsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [earnings, setEarnings] = useState<EarningsData>({
    total: 0,
    monthly: [],
    appointments: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && userRole === 'doctor') {
      fetchEarnings()
    }
  }, [user, userRole, authLoading])

  const fetchEarnings = async () => {
    if (!user) return

    setLoading(true)

    try {
      // Fetch completed appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient_user:patient_id (
            full_name
          )
        `)
        .eq('doctor_id', user.id)
        .eq('status', 'completed')
        .order('starts_at', { ascending: false })

      if (error) throw error

      // Calculate total earnings
      const total = appointments?.reduce((sum, app) => sum + (app.fee || 0), 0) || 0

      // Group by month for chart data
      const monthlyMap: Record<string, number> = {}
      appointments?.forEach((app) => {
        const date = new Date(app.starts_at)
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + (app.fee || 0)
      })

      const monthly = Object.entries(monthlyMap)
        .slice(0, 6)
        .map(([month, amount]) => ({ month, amount }))

      const transformedAppointments = appointments?.map((app) => ({
        id: app.id,
        starts_at: app.starts_at,
        fee: app.fee || 0,
        currency: app.currency || 'GHS',
        patient_name: app.patient_user?.full_name || 'Unknown',
      })) || []

      setEarnings({
        total,
        monthly,
        appointments: transformedAppointments,
      })
    } catch (error) {
      console.error('Error fetching earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading earnings...</p>
        </div>
      </div>
    )
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
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Earnings</span>
            </div>
            <Link href="/doctor" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Total Earnings */}
        <div className="bg-linear-to-br from-blue-700 to-blue-500 rounded-xl px-6 py-8 shadow-sm mb-8">
          <p className="text-sm text-white/70">Total Earnings</p>
          <p className="text-3xl font-bold text-white">
            GHS {earnings.total.toFixed(2)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-white/60 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>{earnings.appointments.length} completed consultations</span>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Monthly Breakdown</h2>
          {earnings.monthly.length === 0 ? (
            <p className="text-gray-500 text-sm">No earnings data available</p>
          ) : (
            <div className="space-y-3">
              {earnings.monthly.map((item) => (
                <div key={item.month} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.month}</span>
                  <span className="font-medium text-gray-900">
                    GHS {item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appointment List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Completed Appointments</h2>
          </div>
          <div className="p-4">
            {earnings.appointments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No completed appointments</p>
            ) : (
              <div className="space-y-3">
                {earnings.appointments.map((app) => (
                  <div key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{app.patient_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(app.starts_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900">
                      {app.currency} {app.fee.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}