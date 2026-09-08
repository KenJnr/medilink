// app/patient/appointments/[id]/reschedule/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Check } from 'lucide-react'

interface Appointment {
  id: string
  starts_at: string
  ends_at: string
  status: string
  reason: string
  consultation_type: string
  fee: number
  currency: string
  doctor_id: string
  doctor: {
    full_name: string
    avatar_url: string | null
    specialty: string
  }
}

interface Schedule {
  id: string
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
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

export default function ReschedulePage() {
  const params = useParams()
  const router = useRouter()
  const appointmentId = params.id as string
  const { user, userRole, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [rescheduling, setRescheduling] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchAppointment()
    }
  }, [user, authLoading])

  // Generate time slots when selectedDate or schedules change
  useEffect(() => {
    if (selectedDate && schedules.length > 0 && appointment) {
      generateTimeSlots()
    }
  }, [selectedDate, schedules, appointment])

  const fetchAppointment = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Fetch appointment details
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_user:doctor_id (
            full_name,
            avatar_url
          )
        `)
        .eq('id', appointmentId)
        .eq('patient_id', user.id)
        .single()

      if (error) throw error

      if (!data) {
        router.push('/patient/appointments')
        return
      }

      const doctorUser = data.doctor_user || {}
      
      const appointmentData: Appointment = {
        ...data,
        doctor: {
          full_name: doctorUser.full_name || 'Unknown',
          avatar_url: doctorUser.avatar_url || null,
          specialty: '',
        }
      }

      setAppointment(appointmentData)

      // Fetch doctor's schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', data.doctor_id)
        .eq('active', true)

      if (scheduleError) throw scheduleError

      const mappedSchedules: Schedule[] = (scheduleData || []).map((s: any) => ({
        id: s.id,
        weekday: s.weekday,
        start_time: s.start_time,
        end_time: s.end_time,
        slot_duration: s.slot_duration || 30,
        active: s.active || true,
      }))
      setSchedules(mappedSchedules)

      // Set default selected date to current appointment date
      const currentDate = new Date(data.starts_at)
      setSelectedDate(currentDate)

    } catch (error) {
      console.error('Error fetching appointment:', error)
      setError('Failed to load appointment details')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = async () => {
    if (!appointment || !selectedDate) {
      return
    }

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

    // Get booked appointments for this doctor on this date
    const { data: bookedAppointments } = await supabase
      .from('appointments')
      .select('starts_at')
      .eq('doctor_id', appointment.doctor_id)
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

    // Get current appointment time to exclude it from booked times if on same day
    const currentTime = new Date(appointment.starts_at)
    const currentTimeStr = currentTime.toTimeString().slice(0, 5)
    const isSameDay = selectedDate.toDateString() === new Date(appointment.starts_at).toDateString()

    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += duration) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
      
      // If same day and this is the current appointment time, mark as available
      const isCurrentSlot = isSameDay && timeStr === currentTimeStr
      
      slots.push({
        time: timeStr,
        available: !bookedTimes.has(timeStr) || isCurrentSlot,
        isBooked: bookedTimes.has(timeStr) && !isCurrentSlot,
      })
    }

    setTimeSlots(slots)

    // Auto-select current slot if available on the same day
    if (isSameDay) {
      const slotExists = slots.some(s => s.time === currentTimeStr && s.available)
      if (slotExists) {
        setSelectedSlot(currentTimeStr)
      }
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot)
  }

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedSlot) return

    setRescheduling(true)
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

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          starts_at: startDateTime.toISOString(),
          ends_at: endDateTime.toISOString(),
        })
        .eq('id', appointment.id)

      if (updateError) {
        if (updateError.code === '23505') {
          setError('This time slot has already been booked. Please select another time.')
          generateTimeSlots()
          return
        }
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/patient/appointments/${appointment.id}`)
      }, 2000)

    } catch (error: any) {
      console.error('Reschedule error:', error)
      setError(error.message || 'Failed to reschedule appointment. Please try again.')
    } finally {
      setRescheduling(false)
    }
  }

  const getAvailableDates = () => {
    const dates: Date[] = []
    const today = new Date()
    
    // Check next 30 days
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

  if (!user || !appointment) {
    return null
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
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Reschedule</span>
            </div>
            <Link href={`/patient/appointments/${appointmentId}`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Cancel
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/patient/appointments" className="hover:text-gray-700">Appointments</Link>
            <span>›</span>
            <Link href={`/patient/appointments/${appointmentId}`} className="hover:text-gray-700">Details</Link>
            <span>›</span>
            <span className="text-gray-900 font-medium">Reschedule</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reschedule Appointment</h1>
          <p className="text-sm text-gray-500 mt-1">Select a new date and time for your appointment</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Appointment Rescheduled!</h2>
            <p className="text-gray-600 mt-1">Your appointment has been successfully rescheduled.</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to appointment details...</p>
          </div>
        )}

        {!success && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Current Appointment Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-medium text-gray-900 mb-4">Current Appointment</h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg shrink-0 overflow-hidden">
                    {appointment.doctor.avatar_url ? (
                      <img src={appointment.doctor.avatar_url} alt={appointment.doctor.full_name} className="w-full h-full object-cover" />
                    ) : (
                      appointment.doctor.full_name?.charAt(0) || 'D'
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Dr. {appointment.doctor.full_name}</p>
                    <p className="text-sm text-gray-500">{appointment.reason || 'General Consultation'}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(appointment.starts_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })} at {new Date(appointment.starts_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Select New Date</h3>
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

            {/* Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Reschedule Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Doctor</span>
                    <span className="font-medium text-gray-900">Dr. {appointment.doctor.full_name}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Date</span>
                    <span className="font-medium text-gray-900">
                      {new Date(appointment.starts_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  
                  {selectedDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">New Date</span>
                      <span className="font-medium text-blue-600">
                        {formatDate(selectedDate)}
                      </span>
                    </div>
                  )}
                  
                  {selectedSlot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">New Time</span>
                      <span className="font-medium text-blue-600">{selectedSlot}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fee</span>
                    <span className="font-semibold text-gray-900">
                      {appointment.currency} {appointment.fee}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleReschedule}
                  disabled={!selectedSlot || rescheduling}
                  className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rescheduling ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Rescheduling...
                    </span>
                  ) : (
                    'Confirm Reschedule'
                  )}
                </button>

                <p className="mt-3 text-xs text-gray-400 text-center">
                  You will be redirected to the appointment details after rescheduling.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}