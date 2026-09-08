// components/video/VideoCallButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video } from 'lucide-react'

interface VideoCallButtonProps {
  appointmentId: string
  doctorId: string
  patientId: string
  role: 'patient' | 'doctor'
  className?: string
}

export default function VideoCallButton({ 
  appointmentId, 
  role,
  className = ''
}: VideoCallButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleJoinCall = async () => {
    setLoading(true)
    
    try {
      // Create video room (no API key needed for Jitsi)
      const response = await fetch('/api/video/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appointmentId,
          role 
        }),
      })
      
      const data = await response.json()
      
      if (data.success && data.roomUrl) {
        // Navigate to video call page with the room URL
        const redirectPath = role === 'doctor' 
          ? `/doctor/appointments/${appointmentId}/video`
          : `/patient/appointments/${appointmentId}/video`
          
        router.push(`${redirectPath}?url=${encodeURIComponent(data.roomUrl)}`)
      } else {
        alert('Failed to start video call. Please try again.')
      }
    } catch (error) {
      console.error('Error starting video call:', error)
      alert('Failed to start video call. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleJoinCall}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 ${className}`}
    >
      <Video className="w-4 h-4" />
      {loading ? 'Connecting...' : 'Join Video Call'}
    </button>
  )
}