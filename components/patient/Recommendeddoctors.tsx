// components/patient/RecommendedDoctors.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Doctor } from '@/lib/types/patient-dashboard'
import { createClient } from '@/lib/supabase/client'

interface RecommendedDoctorsProps {
  doctors?: Doctor[]
}

interface DoctorWithAvatar extends Doctor {
  avatar_url?: string | null
}

export default function RecommendedDoctors({ doctors: propDoctors }: RecommendedDoctorsProps) {
  const [doctors, setDoctors] = useState<DoctorWithAvatar[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (propDoctors && propDoctors.length > 0) {
      setDoctors(propDoctors)
      setLoading(false)
      return
    }

    fetchRecommendedDoctors()
  }, [propDoctors])

  const fetchRecommendedDoctors = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setDoctors([])
        setLoading(false)
        return
      }

      let query = supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          consultation_fee,
          currency,
          location,
          users:user_id (
            full_name,
            avatar_url
          ),
          specialties:specialty_id (
            name
          )
        `)
        .eq('approval_status', 'active')
        .limit(3)

      const { data: currentUserData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (currentUserData?.role === 'doctor') {
        query = query.neq('user_id', user.id)
      }

      const { data: doctorData, error } = await query

      if (error) throw error

      if (!doctorData || doctorData.length === 0) {
        setDoctors([])
        setLoading(false)
        return
      }

      // Transform the data - similar to RecentActivity pattern
      const transformedData: DoctorWithAvatar[] = doctorData.map((doc: any) => {
        // Handle users - Supabase returns an array
        let doctorName = 'Unknown'
        let avatarUrl = null
        
        if (doc.users) {
          if (Array.isArray(doc.users) && doc.users.length > 0) {
            doctorName = doc.users[0]?.full_name || 'Unknown'
            avatarUrl = doc.users[0]?.avatar_url || null
          } else if (!Array.isArray(doc.users)) {
            doctorName = doc.users?.full_name || 'Unknown'
            avatarUrl = doc.users?.avatar_url || null
          }
        }

        // Handle specialties
        let specialtyName = 'General Medicine'
        if (doc.specialties) {
          if (Array.isArray(doc.specialties) && doc.specialties.length > 0) {
            specialtyName = doc.specialties[0]?.name || 'General Medicine'
          } else if (!Array.isArray(doc.specialties)) {
            specialtyName = doc.specialties?.name || 'General Medicine'
          }
        }
        
        return {
          id: doc.id,
          full_name: doctorName,
          specialty_name: specialtyName,
          consultation_fee: doc.consultation_fee || 0,
          currency: doc.currency || 'GHS',
          location: doc.location || '',
          avatar_url: avatarUrl,
        }
      })

      setDoctors(transformedData)
    } catch (error) {
      console.error('Error fetching recommended doctors:', error)
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  // Function to get initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-900">Recommended</h2>
          <Link href="/doctors" className="text-sm text-blue-600 hover:text-blue-700">
            See all
          </Link>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-1 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mt-1 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const displayDoctors = doctors

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-900">Recommended</h2>
        <Link href="/doctors" className="text-sm text-blue-600 hover:text-blue-700">
          See all
        </Link>
      </div>

      {displayDoctors.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Book your first appointment</p>
      ) : (
        <div className="space-y-1">
          {displayDoctors.map((doctor) => {
            const avatarUrl = doctor.avatar_url
            const initials = getInitials(doctor.full_name || 'D')
            
            return (
              <Link
                key={doctor.id}
                href={`/doctors/${doctor.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm flex-shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={doctor.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    doctor.full_name?.charAt(0) || 'D'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">Dr. {doctor.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{doctor.specialty_name}</p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5">
                    {doctor.currency} {doctor.consultation_fee}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}