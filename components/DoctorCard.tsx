// components/DoctorCard.tsx
'use client'

import Link from 'next/link'

interface Doctor {
  id: string
  full_name: string
  specialty_name: string
  consultation_fee: number
  currency: string
  location: string
  experience_years: number
  rating?: number
  profile_image?: string
}

interface DoctorCardProps {
  doctor: Doctor
  showBookButton?: boolean
}

export default function DoctorCard({ doctor, showBookButton = true }: DoctorCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xl flex-shrink-0">
          {doctor.full_name?.charAt(0) || 'D'}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-lg">
            Dr. {doctor.full_name}
          </h3>
          <p className="text-sm text-blue-600 font-medium">
            {doctor.specialty_name || 'General Medicine'}
          </p>
          
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
            {doctor.location && (
              <span className="flex items-center gap-1">📍 {doctor.location}</span>
            )}
            {doctor.experience_years > 0 && (
              <span>{doctor.experience_years} years</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-sm text-gray-500">Consultation fee</p>
          <p className="font-semibold text-gray-900">
            {doctor.currency} {doctor.consultation_fee}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link
            href={`/doctors/${doctor.id}`}
            className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            View Profile
          </Link>
          {showBookButton && (
            <Link
              href={`/booking/${doctor.id}`}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}