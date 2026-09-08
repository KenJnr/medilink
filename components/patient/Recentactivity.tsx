// components/patient/RecentActivity.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Appointment } from '@/lib/types/patient-dashboard'
import { createClient } from '@/lib/supabase/client'

interface RecentActivityProps {
  appointments?: Appointment[]
}

export default function RecentActivity({ appointments: propAppointments }: RecentActivityProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (propAppointments && propAppointments.length > 0) {
      setAppointments(propAppointments)
      setLoading(false)
      return
    }

    fetchRecentActivity()
  }, [propAppointments])

  const fetchRecentActivity = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAppointments([])
        setLoading(false)
        return
      }

      // Fetch recent appointments - use created_at for sorting
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_user:doctor_id (
            full_name,
            avatar_url
          )
        `)
        .eq('patient_id', user.id)
        .in('status', ['completed', 'confirmed', 'cancelled', 'pending_payment'])
        .order('created_at', { ascending: false })  // Sort by created_at, not starts_at
        .limit(3)

      if (error) throw error

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([])
        setLoading(false)
        return
      }

      const doctorIds = appointmentsData.map((app: any) => app.doctor_id)
      
      const { data: doctorProfiles, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('user_id, consultation_fee, specialty_id')
        .in('user_id', doctorIds)

      if (profileError) throw profileError

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

      const userSpecialtyMap: Record<string, string> = {}
      const userFeeMap: Record<string, number> = {}
      const userAvatarMap: Record<string, string | null> = {}
      
      doctorProfiles?.forEach((dp: any) => {
        if (dp.user_id) {
          userSpecialtyMap[dp.user_id] = specialtiesMap[dp.specialty_id] || 'General Medicine'
          userFeeMap[dp.user_id] = dp.consultation_fee || 0
        }
      })

      appointmentsData.forEach((app: any) => {
        if (app.doctor_user?.avatar_url) {
          userAvatarMap[app.doctor_id] = app.doctor_user.avatar_url
        }
      })

      const transformedData: Appointment[] = appointmentsData.map((app: any) => {
        const doctorUser = app.doctor_user || {}
        
        return {
          id: app.id,
          starts_at: app.starts_at,
          ends_at: app.ends_at,
          status: app.status,
          consultation_type: app.consultation_type,
          fee: app.fee,
          currency: app.currency,
          reason: app.reason,
          notes: app.notes,
          doctor_id: app.doctor_id,
          created_at: app.created_at,  // Include created_at
          doctor_profiles: {
            users: {
              full_name: doctorUser.full_name || 'Unknown',
              avatar_url: userAvatarMap[app.doctor_id] || doctorUser.avatar_url || null,
            },
            specialties: {
              name: userSpecialtyMap[app.doctor_id] || 'General Medicine',
            },
            consultation_fee: userFeeMap[app.doctor_id] || 0,
          }
        }
      })

      setAppointments(transformedData)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-emerald-100 text-emerald-600',
      'bg-purple-100 text-purple-600',
      'bg-amber-100 text-amber-600',
      'bg-rose-100 text-rose-600',
      'bg-indigo-100 text-indigo-600',
      'bg-teal-100 text-teal-600',
      'bg-pink-100 text-pink-600',
      'bg-cyan-100 text-cyan-600',
      'bg-violet-100 text-violet-600',
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getActionDescription = (appointment: Appointment) => {
    const doctorName = appointment.doctor_profiles?.users?.full_name || 'Unknown'
    const fee = appointment.doctor_profiles?.consultation_fee || 0
    
    switch (appointment.status) {
      case 'completed':
        return `Paid GHS ${fee} for consultation with Dr. ${doctorName}`
      case 'confirmed':
        return `Booked appointment with Dr. ${doctorName}`
      case 'cancelled':
        return `Cancelled appointment with Dr. ${doctorName}`
      case 'pending_payment':
        return `Pending payment for Dr. ${doctorName}`
      default:
        return `Appointment with Dr. ${doctorName}`
    }
  }

  // Fix: Get relative date using created_at with proper timezone handling
  const getRelativeDate = (dateString: string) => {
    if (!dateString) return 'Recently'
    
    const date = new Date(dateString)
    const now = new Date()
    
    // Get timezone offset in milliseconds
    const offset = now.getTimezoneOffset() * 60000
    const dateUTC = new Date(date.getTime() + offset)
    const nowUTC = new Date(now.getTime() + offset)
    
    const diffMs = nowUTC.getTime() - dateUTC.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    console.log('Date:', dateString, 'Now:', now, 'Diff days:', diffDays) // Debug log
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Recent activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-1 animate-pulse" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const displayAppointments = appointments

  if (displayAppointments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Recent activity</h2>
        <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-medium text-gray-900 mb-4">Recent activity</h2>
      <div className="space-y-4">
        {displayAppointments.slice(0, 3).map((appointment) => {
          const doctorName = appointment.doctor_profiles?.users?.full_name || 'Unknown'
          const specialty = appointment.doctor_profiles?.specialties?.name || 'General medicine'
          const avatarUrl = appointment.doctor_profiles?.users?.avatar_url || null
          const avatarColor = getAvatarColor(doctorName)
          const initials = getInitials(doctorName)
          
          // Use created_at for the date, fallback to starts_at
          const dateString = (appointment as any).created_at || appointment.starts_at
          const relativeDate = getRelativeDate(dateString)
          const actionDescription = getActionDescription(appointment)

          return (
            <div key={appointment.id} className="flex items-start gap-3">
              {/* Doctor Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm shrink-0 mt-0.5 overflow-hidden ${avatarColor}`}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={doctorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              
              {/* Activity Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 leading-relaxed">
                  {actionDescription}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{specialty}</p>
              </div>
              
              {/* Date */}
              <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                {relativeDate}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}