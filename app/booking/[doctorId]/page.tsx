// app/booking/[doctorId]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Check } from 'lucide-react'

interface Doctor {
  id: string
  user_id: string
  consultation_fee: number
  currency: string
  consultation_type: string
  users: {
    full_name: string
    avatar_url: string | null
  }
  specialties: {
    name: string
  }
}

interface Schedule {
  id: string
  doctor_id: string
  weekday: string
  start_time: string
  end_time: string
  slot_duration: number
  active: boolean
}

interface TimeSlot {
  time: string
  available: boolean
  isBooked: boolean
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const getDayName = (date: Date): string => {
  const days = [ 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return days[date.getDay()]
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const doctorId = params.doctorId as string
  const { user } = useAuth()
  const supabase = createClient()

  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [reason, setReason] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchData()
  }, [doctorId])

  useEffect(() => {
    if (selectedDate && schedules.length > 0) {
      generateTimeSlots()
    }
  }, [selectedDate, schedules])

  const findFirstAvailableDate = (startDate: Date, schedules: Schedule[]): Date => {
    const date = new Date(startDate)
    for (let i = 0; i < 30; i++) {
      const dayName = getDayName(date)
      const hasSchedule = schedules.some(s => s.weekday === dayName && s.active)
      if (hasSchedule) {
        return date
      }
      date.setDate(date.getDate() + 1)
    }
    return new Date(startDate)
  }

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch doctor - using a simpler query approach
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          consultation_fee,
          currency,
          consultation_type,
          users:user_id (
            full_name,
            avatar_url
          ),
          specialties:specialty_id (
            name
          )
        `)
        .eq('id', doctorId)
        .eq('approval_status', 'active')
        .single()

      if (doctorError) {
        console.error('Doctor fetch error:', doctorError)
        throw doctorError
      }
      
      if (doctorData) {
        // Use type assertion to handle the data
        const data = doctorData as any
        
        // Extract user data
        let doctorName = 'Unknown'
        let avatarUrl = null
        
        if (data.users) {
          if (Array.isArray(data.users) && data.users.length > 0) {
            doctorName = data.users[0]?.full_name || 'Unknown'
            avatarUrl = data.users[0]?.avatar_url || null
          } else if (!Array.isArray(data.users)) {
            doctorName = data.users?.full_name || 'Unknown'
            avatarUrl = data.users?.avatar_url || null
          }
        }
        
        // Extract specialty data
        let specialtyName = 'General Medicine'
        if (data.specialties) {
          if (Array.isArray(data.specialties) && data.specialties.length > 0) {
            specialtyName = data.specialties[0]?.name || 'General Medicine'
          } else if (!Array.isArray(data.specialties)) {
            specialtyName = data.specialties?.name || 'General Medicine'
          }
        }
        
        const mappedDoctor: Doctor = {
          id: data.id,
          user_id: data.user_id,
          consultation_fee: data.consultation_fee || 0,
          currency: data.currency || 'GHS',
          consultation_type: data.consultation_type || 'in_person',
          users: {
            full_name: doctorName,
            avatar_url: avatarUrl,
          },
          specialties: {
            name: specialtyName,
          },
        }
        setDoctor(mappedDoctor)
        console.log('Mapped doctor:', mappedDoctor)
      }

      // Fetch schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('active', true)

      if (scheduleError) {
        console.error('Schedule fetch error:', scheduleError)
        throw scheduleError
      }
      
      const mappedSchedules: Schedule[] = (scheduleData || []).map((s: any) => ({
        id: s.id,
        doctor_id: s.doctor_id,
        weekday: s.weekday,
        start_time: s.start_time,
        end_time: s.end_time,
        slot_duration: s.slot_duration || 30,
        active: s.active || true,
      }))
      setSchedules(mappedSchedules)
      console.log('Schedules from DB:', mappedSchedules)

      // Find first available date
      if (!selectedDate && mappedSchedules.length > 0) {
        const today = new Date()
        const firstAvailableDate = findFirstAvailableDate(today, mappedSchedules)
        setSelectedDate(firstAvailableDate)
        console.log('First available date:', firstAvailableDate)
      }

    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Failed to load booking data')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = async () => {
    if (!selectedDate || !doctor) return

    const dayName = getDayName(selectedDate)
    const schedule = schedules.find(s => s.weekday === dayName && s.active)

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
      .eq('doctor_id', doctorId)
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
    if (!user || !doctor || !selectedDate || !selectedSlot) return

    setBooking(true)
    setError('')

    try {
      const [hours, minutes] = selectedSlot.split(':').map(Number)
      const startDateTime = new Date(selectedDate)
      startDateTime.setHours(hours, minutes, 0, 0)
      
      const endDateTime = new Date(startDateTime)
      const dayName = getDayName(selectedDate)
      const schedule = schedules.find(s => s.weekday === dayName)
      const duration = schedule?.slot_duration || 30
      endDateTime.setMinutes(endDateTime.getMinutes() + duration)

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          doctor_id: doctor.user_id,
          starts_at: startDateTime.toISOString(),
          ends_at: endDateTime.toISOString(),
          status: 'pending_payment',
          consultation_type: doctor.consultation_type || 'in_person',
          reason: reason || 'General consultation',
          fee: doctor.consultation_fee,
          currency: doctor.currency || 'GHS',
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
          amount: doctor.consultation_fee,
          currency: doctor.currency || 'GHS',
          status: 'pending',
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
      const hasSchedule = schedules.some(s => s.weekday === dayName && s.active)
      if (hasSchedule) {
        dates.push(date)
      }
    }
    return dates
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading booking details...</p>
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

  const availableDates = getAvailableDates()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Book Appointment</span>
            </div>
            <Link href="/doctors" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Cancel
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Appointment Booked!</h2>
            <p className="text-gray-600 mt-1">Please complete your payment to confirm.</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to payments...</p>
          </div>
        )}

        {!success && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl text-blue-600 overflow-hidden">
                    {doctor.users?.avatar_url ? (
                      <img src={doctor.users.avatar_url} alt={doctor.users.full_name} className="w-full h-full object-cover" />
                    ) : (
                      doctor.users?.full_name?.charAt(0) || 'D'
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Dr. {doctor.users?.full_name || 'Unknown'}
                    </h2>
                    <p className="text-sm text-blue-600">{doctor.specialties?.name || 'General Medicine'}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Fee: {doctor.currency} {doctor.consultation_fee}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Select Date</h3>
                {availableDates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No available dates. Please check back later.</p>
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

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Booking Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Doctor</span>
                    <span className="font-medium text-gray-900">Dr. {doctor.users?.full_name?.split(' ')[0]}</span>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-medium text-gray-900">
                        {selectedDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
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
                      {doctor.currency} {doctor.consultation_fee}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm text-gray-700 mb-1">Reason (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

                <p className="mt-3 text-xs text-gray-400 text-center">
                  You will be redirected to payment after booking.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}