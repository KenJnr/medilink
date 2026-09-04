// app/doctors/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { 
  MapPin, 
  Clock, 
  Star, 
  Calendar, 
  User, 
  Phone, 
  Mail,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  Video,
  Building2
} from 'lucide-react'

interface DoctorDetail {
  id: string
  user_id: string
  bio: string
  qualifications: string[]
  experience_years: number
  consultation_fee: number
  currency: string
  location: string
  consultation_type: string
  profile_image: string
  approval_status: string
  users: {
    full_name: string
    email: string
    phone: string
    avatar_url: string
  }
  specialties: {
    name: string
    description: string
  }
}

export default function DoctorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const doctorId = params.id as string
  const { user } = useAuth()
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDoctor()
  }, [doctorId])

  const fetchDoctor = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select(`
        *,
        users:user_id (
          full_name,
          email,
          phone,
          avatar_url
        ),
        specialties:specialty_id (
          name,
          description
        )
      `)
      .eq('id', doctorId)
      .eq('approval_status', 'active')
      .single()

    if (!error) {
      setDoctor(data)
    }
    
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading doctor profile...</p>
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Doctor not found</h1>
          <Link href="/doctors" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to doctors
          </Link>
        </div>
      </div>
    )
  }

  const consultationTypeMap: Record<string, string> = {
    in_person: 'In-Person',
    virtual: 'Virtual',
    both: 'Both',
  }

  const consultationTypeIcon = {
    in_person: Building2,
    virtual: Video,
    both: Calendar,
  }
  const TypeIcon = consultationTypeIcon[doctor.consultation_type as keyof typeof consultationTypeIcon] || Building2

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
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Doctor Profile</span>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <Link 
                  href="/patient" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/doctors" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to doctors
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl text-white overflow-hidden">
                {doctor.users?.avatar_url ? (
                  <img src={doctor.users.avatar_url} alt={doctor.users.full_name} className="w-full h-full object-cover" />
                ) : (
                  doctor.users?.full_name?.charAt(0) || 'D'
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Dr. {doctor.users?.full_name || 'Unknown'}
                </h1>
                <p className="text-blue-100">{doctor.specialties?.name || 'General Medicine'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm">4.8 / 5.0</span>
                  </div>
                  <span className="text-white/30">|</span>
                  <span className="text-sm text-blue-100">
                    {doctor.experience_years} years experience
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Consultation Fee</p>
                <p className="font-semibold text-gray-900">
                  {doctor.currency} {doctor.consultation_fee}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {doctor.location || 'Not specified'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Experience</p>
                <p className="font-semibold text-gray-900">
                  {doctor.experience_years} years
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Consultation Type</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {consultationTypeMap[doctor.consultation_type] || doctor.consultation_type}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {doctor.users?.email && (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {doctor.users.email}
                </span>
              )}
              {doctor.users?.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {doctor.users.phone}
                </span>
              )}
            </div>

            {/* Bio */}
            {doctor.bio && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{doctor.bio}</p>
              </div>
            )}

            {/* Qualifications */}
            {doctor.qualifications && doctor.qualifications.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Qualifications</h3>
                <ul className="space-y-1">
                  {doctor.qualifications.map((qual, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      {qual}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Book Button */}
            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              {user ? (
                <Link
                  href={`/booking/${doctor.id}`}
                  className="flex-1 text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Book Appointment
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex-1 text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Login to Book
                </Link>
              )}
              <Link
                href="/doctors"
                className="flex-1 text-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Back to Search
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}