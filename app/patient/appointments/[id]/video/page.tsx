// app/patient/appointments/[id]/video/page.tsx
'use client'

import { useParams, useSearchParams } from 'next/navigation'
import VideoCallRoom from '@/components/video/VideoCallRoom'

export default function PatientVideoCallPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const appointmentId = params.id as string
  const roomUrl = searchParams.get('url') || ''

  return (
    <VideoCallRoom 
      appointmentId={appointmentId} 
      roomUrl={roomUrl} 
      role="patient" 
    />
  )
}