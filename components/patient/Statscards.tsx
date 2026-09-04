// components/patient/StatsCards.tsx
'use client'

import { useEffect, useState } from 'react'
import type { DashboardStats } from '@/lib/types/patient-dashboard'
import { createClient } from '@/lib/supabase/client'

interface StatsCardsProps {
  stats: DashboardStats
}

export default function StatsCards({ stats: propStats }: StatsCardsProps) {
  const [stats, setStats] = useState<DashboardStats>({
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // If stats are passed as props, use them
    if (propStats && propStats.total > 0) {
      setStats(propStats)
      setLoading(false)
      return
    }

    // Otherwise fetch from database
    fetchStats()
  }, [propStats])

  const fetchStats = async () => {
    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch all appointments for the patient
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('status')
        .eq('patient_id', user.id)

      if (error) throw error

      // Calculate stats
      const confirmed = appointments?.filter((app: any) => app.status === 'confirmed') || []
      const pending = appointments?.filter((app: any) => app.status === 'pending_payment') || []
      const completed = appointments?.filter((app: any) => app.status === 'completed') || []
      const cancelled = appointments?.filter((app: any) => app.status === 'cancelled') || []

      setStats({
        confirmed: confirmed.length,
        pending: pending.length,
        completed: completed.length,
        cancelled: cancelled.length,
        total: appointments?.length || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const items = [
    { 
      label: 'Confirmed', 
      value: stats.confirmed || 0, 
      indicatorColor: 'bg-blue-400',
      gradient: 'from-blue-700 to-blue-500'
    },
    { 
      label: 'Payment Pending', 
      value: stats.pending || 0, 
      indicatorColor: 'bg-yellow-400',
      gradient: 'from-blue-700 to-blue-500'
    },
    { 
      label: 'Completed', 
      value: stats.completed || 0, 
      indicatorColor: 'bg-emerald-500',
      gradient: 'from-blue-700 to-blue-500'
    },
    { 
      label: 'Cancelled', 
      value: stats.cancelled || 0, 
      indicatorColor: 'bg-red-500',
      gradient: 'from-blue-700 to-blue-500'
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {items.map((item) => (
          <div 
            key={item.label} 
            className={`bg-gradient-to-br ${item.gradient} rounded-xl px-4 py-6 shadow-sm relative overflow-hidden`}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full">
              <div className={`w-full h-full rounded-full ${item.indicatorColor}`} />
            </div>
            <p className="text-xs text-white/70 mb-1 relative z-10">{item.label}</p>
            <div className="h-6 w-12 bg-white/20 rounded animate-pulse relative z-10" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {items.map((item) => (
        <div 
          key={item.label} 
          className={`bg-gradient-to-br ${item.gradient} rounded-xl px-4 py-6 shadow-sm relative overflow-hidden`}
        >
          {/* Circular Indicator - Top Right (contained within card) */}
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full">
            <div className={`w-full h-full rounded-full ${item.indicatorColor}`} />
          </div>
          
          <p className="text-xs text-white/70 mb-1 relative z-10">{item.label}</p>
          <p className="text-xl font-medium text-white relative z-10">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}