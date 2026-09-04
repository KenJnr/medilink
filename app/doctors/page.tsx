// app/doctors/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { Search, MapPin, Clock, Star, Calendar, User } from 'lucide-react'

interface Specialty {
  id: string
  name: string
}

interface Doctor {
  id: string
  user_id: string
  full_name: string
  specialty_name: string
  consultation_fee: number
  currency: string
  location: string
  experience_years: number
  bio: string
  qualifications: string[]
  consultation_type: string
  rating: number
  approval_status: string
  avatar_url: string
}

export default function DoctorsPage() {
  const { user, userRole } = useAuth()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchSpecialties()
    fetchDoctors()
  }, [])

  useEffect(() => {
    fetchDoctors()
  }, [searchTerm, selectedSpecialty])

  const fetchSpecialties = async () => {
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .eq('active', true)
    if (data) setSpecialties(data)
  }

  const fetchDoctors = async () => {
    setLoading(true)
    
    let query = supabase
      .from('doctor_profiles')
      .select(`
        id,
        user_id,
        bio,
        qualifications,
        experience_years,
        consultation_fee,
        currency,
        location,
        consultation_type,
        approval_status,
        users:user_id (
          full_name,
          avatar_url
        ),
        specialties:specialty_id (
          name
        )
      `)
      .eq('approval_status', 'active')

    if (selectedSpecialty) {
      query = query.eq('specialty_id', selectedSpecialty)
    }

    const { data, error } = await query

    if (!error && data) {
      const mappedDoctors: Doctor[] = data.map((doc: any) => ({
        id: doc.id,
        user_id: doc.user_id,
        full_name: doc.users?.full_name || 'Unknown',
        specialty_name: doc.specialties?.name || 'General Medicine',
        consultation_fee: doc.consultation_fee || 0,
        currency: doc.currency || 'GHS',
        location: doc.location || '',
        experience_years: doc.experience_years || 0,
        bio: doc.bio || '',
        qualifications: doc.qualifications || [],
        consultation_type: doc.consultation_type || 'in_person',
        approval_status: doc.approval_status,
        avatar_url: doc.users?.avatar_url || '',
        rating: 4.5 + Math.random() * 0.5, // Placeholder for now
      }))
      
      const filtered = searchTerm
        ? mappedDoctors.filter(doc => 
            doc.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.specialty_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : mappedDoctors
      
      setDoctors(filtered)
    }
    
    setLoading(false)
  }

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
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Find Doctors</span>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <Link 
                  href={userRole === 'patient' ? '/patient' : '/doctor'} 
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Find a Doctor</h1>
          <p className="mt-1 text-gray-500">Connect with trusted healthcare providers</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400 text-gray-900"
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white text-gray-900"
              >
                <option value="">All Specialties</option>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${doctors.length} doctors found`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No doctors found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// Doctor Card Component
function DoctorCard({ doctor }: { doctor: Doctor }) {
  const consultationTypeMap: Record<string, string> = {
    in_person: 'In-Person',
    virtual: 'Virtual',
    both: 'In-Person & Virtual',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xl flex-shrink-0 overflow-hidden">
            {doctor.avatar_url ? (
              <img src={doctor.avatar_url} alt={doctor.full_name} className="w-full h-full object-cover" />
            ) : (
              doctor.full_name?.charAt(0) || 'D'
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  Dr. {doctor.full_name}
                </h3>
                <p className="text-sm text-blue-600 font-medium">
                  {doctor.specialty_name}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-700">{doctor.rating?.toFixed(1) || '4.5'}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
              {doctor.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {doctor.location}
                </span>
              )}
              {doctor.experience_years > 0 && (
                <span>{doctor.experience_years} years exp.</span>
              )}
              <span className="capitalize">{consultationTypeMap[doctor.consultation_type] || doctor.consultation_type}</span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Consultation fee</p>
                <p className="font-bold text-gray-900">
                  {doctor.currency} {doctor.consultation_fee}
                </p>
              </div>
              <Link
                href={`/doctors/${doctor.id}`}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}