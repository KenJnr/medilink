// components/video/VideoCallRoom.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Loader2, PhoneOff } from 'lucide-react'
import JitsiCall from './JitsiCall'

interface VideoCallRoomProps {
  appointmentId: string
  roomUrl: string
  role: 'patient' | 'doctor'
  onEnd?: () => void
}

export default function VideoCallRoom({ 
  appointmentId, 
  roomUrl, 
  role,
  onEnd 
}: VideoCallRoomProps) {
  const router = useRouter()
  const { user, userRole, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [callEnded, setCallEnded] = useState(false)
  const [appointment, setAppointment] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && appointmentId) {
      fetchAppointment()
    }
  }, [user, authLoading, appointmentId])

  const fetchAppointment = async () => {
    if (!user) return

    try {
      console.log('Fetching appointment:', appointmentId, 'Role:', role, 'User:', user.id)

      // Build the query based on role
      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctor_user:doctor_id (
            full_name,
            avatar_url
          ),
          patient_user:patient_id (
            full_name,
            avatar_url
          )
        `)
        .eq('id', appointmentId)
      
      // Apply the role-based filter
      if (role === 'doctor') {
        query = query.eq('doctor_id', user.id)
      } else {
        query = query.eq('patient_id', user.id)
      }
      
      const { data, error } = await query.single()

      if (error) {
        console.error('Error fetching appointment:', error)
        
        // If not found, try without the role filter (for debugging)
        if (error.code === 'PGRST116') {
          console.log('Appointment not found with role filter, trying without...')
          
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('appointments')
            .select(`
              *,
              doctor_user:doctor_id (
                full_name,
                avatar_url
              ),
              patient_user:patient_id (
                full_name,
                avatar_url
              )
            `)
            .eq('id', appointmentId)
            .single()
          
          if (!fallbackError && fallbackData) {
            console.log('Found appointment without role filter:', fallbackData)
            setAppointment(fallbackData)
            
            // Set display name
            if (role === 'doctor') {
              setDisplayName(fallbackData.doctor_user?.full_name || 'Doctor')
            } else {
              setDisplayName(fallbackData.patient_user?.full_name || user.full_name || 'Patient')
            }
            setLoading(false)
            return
          }
        }
        
        setError('Could not find appointment')
        setLoading(false)
        return
      }

      console.log('Appointment found:', data)
      setAppointment(data)
      
      // Set display name based on role
      if (role === 'doctor') {
        setDisplayName(data.doctor_user?.full_name || 'Doctor')
      } else {
        setDisplayName(data.patient_user?.full_name || user.full_name || 'Patient')
      }
      
    } catch (error) {
      console.error('Error fetching appointment:', error)
      setError('Failed to load appointment details')
    } finally {
      setLoading(false)
    }
  }

  const handleEndCall = () => {
    setCallEnded(true)
    if (onEnd) {
      onEnd()
    }
    setTimeout(() => {
      const redirectPath = role === 'doctor' 
        ? `/doctor/appointments/${appointmentId}`
        : `/patient/appointments/${appointmentId}`
      router.push(redirectPath)
    }, 2000)
  }

  // Generate a unique room name
  const roomName = `medilink-${appointmentId.slice(0, 8)}-${Date.now()}`

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
          <p className="mt-4 text-white/60 text-sm">Loading video call...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <p className="text-lg font-medium text-red-400">{error}</p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-white"
            >
              Retry
            </button>
            <Link
              href={role === 'doctor' ? `/doctor/appointments/${appointmentId}` : `/patient/appointments/${appointmentId}`}
              className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-white"
            >
              ← Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-xl font-bold">Call Ended</p>
          <p className="text-white/50 text-sm mt-2">Thank you for using MediLink</p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto mt-4" />
        </div>
      </div>
    )
  }

  // Use the roomUrl if provided, otherwise use generated room name
  const jitsiRoomName = roomUrl ? roomUrl.split('/').pop() : roomName

  return (
    <JitsiCall
      roomName={jitsiRoomName || roomName}
      displayName={displayName || user?.full_name || 'User'}
      onEnd={handleEndCall}
    />
  )
}