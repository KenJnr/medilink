// app/patient/book/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface PreviousDoctor {
  id: string // This is the doctor's user_id
  profile_id: string // The doctor_profiles.id
  user_id: string
  full_name: string
  specialty_name: string
  consultation_fee: number
  currency: string
  avatar_url: string | null
  last_visit: string
  appointment_id: string
}

interface TimeSlot {
  time: string
  available: boolean
  isBooked: boolean
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const getDayName = (date: Date): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

export default function QuickBookPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [previousDoctors, setPreviousDoctors] = useState<PreviousDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<PreviousDoctor | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [reason, setReason] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchPreviousDoctors()
    }
  }, [user, authLoading])

  useEffect(() => {
    if (selectedDoctor && selectedDate && schedules.length > 0) {
      generateTimeSlots()
    }
  }, [selectedDoctor, selectedDate, schedules])

  const fetchPreviousDoctors = async () => {
    if (!user) return

    setLoading(true)

    try {
      // Fetch distinct doctors from past appointments
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          starts_at,
          doctor_id,
          doctor_user:doctor_id (
            full_name,
            avatar_url
          )
        `)
        .eq('patient_id', user.id)
        .neq('status', 'cancelled')
        .order('starts_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        setPreviousDoctors([])
        setLoading(false)
        return
      }

      // Get unique doctors
      const doctorMap = new Map<string, any>()
      
      data.forEach((app: any) => {
        if (!doctorMap.has(app.doctor_id)) {
          const doctorUser = app.doctor_user || {}
          doctorMap.set(app.doctor_id, {
            user_id: app.doctor_id,
            full_name: doctorUser.full_name || 'Unknown',
            avatar_url: doctorUser.avatar_url || null,
            last_visit: app.starts_at,
            appointment_id: app.id,
          })
        }
      })

      const doctorUserIds = Array.from(doctorMap.keys())

      // Get doctor profiles to get the profile_id and specialties
      const { data: profiles, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('id, user_id, consultation_fee, currency, specialty_id')
        .in('user_id', doctorUserIds)

      if (profileError) throw profileError

      // Get specialties
      const specialtyIds = profiles?.map((p: any) => p.specialty_id).filter(Boolean) || []
      let specialtiesMap: Record<string, string> = {}
      
      if (specialtyIds.length > 0) {
        const { data: specialties, error: specError } = await supabase
          .from('specialties')
          .select('id, name')
          .in('id', specialtyIds)

        if (!specError && specialties) {
          specialtiesMap = specialties.reduce((acc: Record<string, string>, s: any) => {
            acc[s.id] = s.name
            return acc
          }, {})
        }
      }

      // Build profile map
      const profileMap = profiles?.reduce((acc: Record<string, any>, p: any) => {
        acc[p.user_id] = {
          profile_id: p.id,
          consultation_fee: p.consultation_fee || 0,
          currency: p.currency || 'GHS',
          specialty_name: specialtiesMap[p.specialty_id] || 'General Medicine',
        }
        return acc
      }, {})

      // Combine data
      const result: PreviousDoctor[] = Array.from(doctorMap.entries()).map(([user_id, value]) => {
        const profile = profileMap[user_id] || {}
        return {
          id: user_id, // This is the user_id
          profile_id: profile.profile_id || '',
          user_id: user_id,
          full_name: value.full_name,
          avatar_url: value.avatar_url,
          last_visit: value.last_visit,
          appointment_id: value.appointment_id,
          specialty_name: profile.specialty_name || 'General Medicine',
          consultation_fee: profile.consultation_fee || 0,
          currency: profile.currency || 'GHS',
        }
      })

      setPreviousDoctors(result.slice(0, 5))
    } catch (error) {
      console.error('Error fetching previous doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const findFirstAvailableDate = (startDate: Date, schedules: any[]): Date => {
    const date = new Date(startDate)
    for (let i = 0; i < 30; i++) {
      const dayName = getDayName(date)
      const hasSchedule = schedules.some((s: any) => s.weekday === dayName && s.active)
      if (hasSchedule) {
        return date
      }
      date.setDate(date.getDate() + 1)
    }
    return new Date(startDate)
  }

  const handleSelectDoctor = async (doctor: PreviousDoctor) => {
    setSelectedDoctor(doctor)
    setShowBooking(true)
    setSelectedDate(null)
    setSelectedSlot(null)
    setTimeSlots([])
    setError('')

    // Fetch doctor's schedule using the profile_id
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctor.profile_id) // Use profile_id here
      .eq('active', true)

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError)
      return
    }

    console.log('Schedule data for doctor:', doctor.full_name, scheduleData)

    setSchedules(scheduleData || [])

    // Set default date to first available
    if (scheduleData && scheduleData.length > 0) {
      const today = new Date()
      const firstAvailable = findFirstAvailableDate(today, scheduleData)
      setSelectedDate(firstAvailable)
    } else {
      setError('This doctor has no available schedule. Please try another doctor.')
    }
  }

  const generateTimeSlots = async () => {
    if (!selectedDoctor || !selectedDate) return

    const dayName = getDayName(selectedDate)
    const schedule = schedules.find((s: any) => s.weekday === dayName && s.active)

    if (!schedule) {
      setTimeSlots([])
      return
    }

    const slots: TimeSlot[] = []
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number)
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number)
    const duration = schedule.slot_duration || 30

    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

    const dateStr = selectedDate.toISOString().split('T')[0]
    const { data: bookedAppointments } = await supabase
      .from('appointments')
      .select('starts_at')
      .eq('doctor_id', selectedDoctor.user_id)
      .gte('starts_at', `${dateStr}T00:00:00`)
      .lt('starts_at', `${dateStr}T23:59:59`)
      .in('status', ['confirmed', 'pending_payment', 'payment_processing'])

    const bookedTimes = new Set()
    bookedAppointments?.forEach((app: any) => {
      const time = new Date(app.starts_at)
      const hours = time.getHours().toString().padStart(2, '0')
      const minutes = time.getMinutes().toString().padStart(2, '0')
      bookedTimes.add(`${hours}:${minutes}`)
    })

    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += duration) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
      
      slots.push({
        time: timeStr,
        available: !bookedTimes.has(timeStr),
        isBooked: bookedTimes.has(timeStr),
      })
    }

    setTimeSlots(slots)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot)
  }

  const handleBooking = async () => {
    if (!user || !selectedDoctor || !selectedDate || !selectedSlot) return

    setBooking(true)
    setError('')

    try {
      const [hours, minutes] = selectedSlot.split(':').map(Number)
      const startDateTime = new Date(selectedDate)
      startDateTime.setHours(hours, minutes, 0, 0)
      
      const endDateTime = new Date(startDateTime)
      const dayName = getDayName(selectedDate)
      const schedule = schedules.find((s: any) => s.weekday === dayName)
      const duration = schedule?.slot_duration || 30
      endDateTime.setMinutes(endDateTime.getMinutes() + duration)

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          doctor_id: selectedDoctor.user_id,
          starts_at: startDateTime.toISOString(),
          ends_at: endDateTime.toISOString(),
          status: 'pending_payment',
          consultation_type: 'in_person',
          reason: reason || 'Follow-up visit',
          fee: selectedDoctor.consultation_fee,
          currency: selectedDoctor.currency || 'GHS',
        })
        .select()
        .single()

      if (appointmentError) {
        if (appointmentError.code === '23505') {
          setError('This time slot has already been booked. Please select another time.')
          generateTimeSlots()
          return
        }
        throw appointmentError
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointment.id,
          amount: selectedDoctor.consultation_fee,
          currency: selectedDoctor.currency || 'GHS',
          status: 'pending',
          provider: 'mock',
        })

      if (paymentError) throw paymentError

      setSuccess(true)
      setTimeout(() => {
        router.push('/patient/payments')
      }, 2000)

    } catch (error: any) {
      console.error('Booking error:', error)
      setError(error.message || 'Failed to book appointment. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  const getAvailableDates = () => {
    const dates: Date[] = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dayName = getDayName(date)
      const hasSchedule = schedules.some((s: any) => s.weekday === dayName && s.active)
      if (hasSchedule) {
        dates.push(date)
      }
    }
    return dates
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not selected'
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const availableDates = getAvailableDates()

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
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Quick Book</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/patient" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Quick Book</h1>
          <p className="text-sm text-gray-500">Book a follow-up appointment with a previous doctor</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Appointment Booked!</h2>
            <p className="text-gray-600 mt-1">Please complete your payment to confirm.</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to payments...</p>
          </div>
        )}

        {!success && !showBooking && (
          <div>
            {previousDoctors.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">You haven't booked any appointments yet.</p>
                <Link
                  href="/doctors"
                  className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Find a doctor →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previousDoctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    onClick={() => handleSelectDoctor(doctor)}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg flex-shrink-0 overflow-hidden">
                        {doctor.avatar_url ? (
                          <img src={doctor.avatar_url} alt={doctor.full_name} className="w-full h-full object-cover" />
                        ) : (
                          doctor.full_name?.charAt(0) || 'D'
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Dr. {doctor.full_name}</p>
                        <p className="text-sm text-gray-500">{doctor.specialty_name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Last visit: {new Date(doctor.last_visit).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!success && showBooking && selectedDoctor && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Doctor Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl text-blue-600 overflow-hidden">
                    {selectedDoctor.avatar_url ? (
                      <img src={selectedDoctor.avatar_url} alt={selectedDoctor.full_name} className="w-full h-full object-cover" />
                    ) : (
                      selectedDoctor.full_name?.charAt(0) || 'D'
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Dr. {selectedDoctor.full_name}</h2>
                    <p className="text-sm text-blue-600">{selectedDoctor.specialty_name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Fee: {selectedDoctor.currency} {selectedDoctor.consultation_fee}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Select Date</h3>
                {availableDates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {error || 'No available dates. Please check back later.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {availableDates.slice(0, 14).map((date, index) => {
                      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
                      const dayName = DAY_LABELS[date.getDay()]
                      const dayNum = date.getDate()
                      const isToday = date.toDateString() === new Date().toDateString()

                      return (
                        <button
                          key={index}
                          onClick={() => handleDateSelect(date)}
                          className={`p-2 rounded-lg text-center transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                            {dayName}
                          </p>
                          <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {dayNum}
                          </p>
                          {isToday && (
                            <p className={`text-[8px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                              Today
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Available Times for {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  {timeSlots.length === 0 ? (
                    <p className="text-sm text-gray-500">No available slots on this day</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && handleSlotSelect(slot.time)}
                          disabled={!slot.available}
                          className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                            slot.isBooked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : selectedSlot === slot.time
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-50 text-gray-700 hover:bg-blue-50 border border-gray-200'
                          }`}
                        >
                          {slot.time}
                          {slot.isBooked && <span className="block text-[8px]">Booked</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Booking Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Booking Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Doctor</span>
                    <span className="font-medium text-gray-900">Dr. {selectedDoctor.full_name}</span>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(selectedDate)}
                      </span>
                    </div>
                  )}
                  {selectedSlot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Time</span>
                      <span className="font-medium text-gray-900">{selectedSlot}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fee</span>
                    <span className="font-semibold text-gray-900">
                      {selectedDoctor.currency} {selectedDoctor.consultation_fee}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm text-gray-700 mb-1">Reason (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 text-gray-900"
                    placeholder="Brief reason for visit..."
                  />
                </div>

                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleBooking}
                  disabled={!selectedSlot || booking}
                  className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {booking ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Booking...
                    </span>
                  ) : (
                    'Book Appointment'
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowBooking(false)
                    setSelectedDoctor(null)
                    setSelectedDate(null)
                    setSelectedSlot(null)
                  }}
                  className="mt-2 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to doctors
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}