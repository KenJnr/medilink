'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'

interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  starts_at: string
  ends_at: string
  status: string
  consultation_type: string
  reason: string | null
  fee: number
  currency: string
  doctor_user: {
    full_name: string
    avatar_url?: string | null
  } | null
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
  start: Date
  end: Date
  available: boolean
}

const DAYS_OF_WEEK = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const DAY_LABELS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
]

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export default function RescheduleAppointmentPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const supabase = useMemo(() => createClient(), [])

  const appointmentId = params.id as string

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])

  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [currentMonth, setCurrentMonth] = useState(new Date())

  /*
   * ---------------------------------------------------------
   * Helpers
   * ---------------------------------------------------------
   */

  const formatDateForDatabase = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  const isPastDate = (date: Date) => {
    const today = new Date()

    today.setHours(0, 0, 0, 0)

    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)

    return compareDate < today
  }

  const getScheduleForDate = (date: Date) => {
    const weekday = DAYS_OF_WEEK[date.getDay()]

    return schedules.find(
      (schedule) =>
        schedule.weekday.toLowerCase() === weekday &&
        schedule.active
    )
  }

  /*
   * ---------------------------------------------------------
   * Fetch appointment
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (authLoading || !user || !appointmentId) {
      return
    }

    const fetchAppointment = async () => {
      try {
        setLoading(true)
        setError('')

        console.log('Fetching appointment for reschedule...')
        console.log('Fetching appointment ID:', appointmentId)

        const { data, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id,
            patient_id,
            doctor_id,
            starts_at,
            ends_at,
            status,
            consultation_type,
            reason,
            fee,
            currency,
            doctor_user:users!appointments_doctor_id_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('id', appointmentId)
          .eq('patient_id', user.id)
          .single()

        if (appointmentError) {
          console.error(
            'Error fetching appointment:',
            appointmentError
          )

          throw new Error(
            appointmentError.message ||
              'Failed to load appointment'
          )
        }

        if (!data) {
          throw new Error('Appointment not found')
        }

        console.log('Appointment found:', data)

        const mappedAppointment: Appointment = {
  id: data.id,
  patient_id: data.patient_id,
  doctor_id: data.doctor_id,
  starts_at: data.starts_at,
  ends_at: data.ends_at,
  status: data.status,
  consultation_type: data.consultation_type,
  reason: data.reason || null,
  fee: data.fee,
  currency: data.currency,
  doctor_user: data.doctor_user && data.doctor_user.length > 0 
    ? {
        full_name: data.doctor_user[0]?.full_name || 'Unknown',
        avatar_url: data.doctor_user[0]?.avatar_url || null,
      }
    : null
}

setAppointment(mappedAppointment)

        /*
         * -----------------------------------------------------
         * IMPORTANT:
         *
         * appointment.doctor_id is the doctor's USER ID.
         *
         * doctor_schedules.doctor_id uses doctor_profiles.id.
         *
         * Therefore:
         *
         * appointment.doctor_id
         *        ↓
         * doctor_profiles.user_id
         *        ↓
         * doctor_profiles.id
         *        ↓
         * doctor_schedules.doctor_id
         * -----------------------------------------------------
         */

        console.log(
          'Looking up doctor profile using user ID:',
          data.doctor_id
        )

        const { data: doctorProfile, error: doctorProfileError } =
          await supabase
            .from('doctor_profiles')
            .select('id, user_id')
            .eq('user_id', data.doctor_id)
            .single()

        if (doctorProfileError) {
          console.error(
            'Error fetching doctor profile:',
            doctorProfileError
          )

          throw new Error(
            'Could not find the doctor profile for this appointment.'
          )
        }

        if (!doctorProfile) {
          throw new Error('Doctor profile not found.')
        }

        console.log('Doctor profile found:', doctorProfile)

        /*
         * -----------------------------------------------------
         * NOW use doctor_profiles.id to fetch schedules.
         * -----------------------------------------------------
         */

        console.log(
          'Fetching schedule using doctor profile ID:',
          doctorProfile.id
        )

        const { data: scheduleData, error: scheduleError } =
          await supabase
            .from('doctor_schedules')
            .select('*')
            .eq('doctor_id', doctorProfile.id)
            .eq('active', true)
            .order('weekday')
            .order('start_time')

        if (scheduleError) {
          console.error(
            'Error fetching doctor schedule:',
            scheduleError
          )

          throw new Error(
            scheduleError.message ||
              'Failed to load doctor schedule'
          )
        }

        console.log('Raw schedule data:', scheduleData)

        const mappedSchedules: Schedule[] = (scheduleData || []).map(
          (schedule) => ({
            ...schedule,
            active: schedule.active ?? true,
            weekday: String(schedule.weekday).toLowerCase(),
          })
        )

        console.log('Mapped schedules:', mappedSchedules)

        setSchedules(mappedSchedules)

        /*
         * Set the currently booked date initially.
         */
        const appointmentDate = new Date(data.starts_at)

        console.log(
          'Current appointment date:',
          appointmentDate
        )

        setSelectedDate(appointmentDate)

        setCurrentMonth(
          new Date(
            appointmentDate.getFullYear(),
            appointmentDate.getMonth(),
            1
          )
        )
      } catch (err) {
        console.error('Reschedule page error:', err)

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load appointment'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAppointment()
  }, [authLoading, user, appointmentId, supabase])

  /*
   * ---------------------------------------------------------
   * Generate available time slots
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedDate || !appointment || schedules.length === 0) {
      setTimeSlots([])
      return
    }

    const generateTimeSlots = async () => {
      try {
        setSlotsLoading(true)
        setSelectedSlot(null)

        const schedule = getScheduleForDate(selectedDate)

        console.log('Selected date:', selectedDate)
        console.log('Schedule for selected date:', schedule)

        if (!schedule) {
          setTimeSlots([])
          return
        }

        /*
         * Get all appointments for this doctor on the selected date.
         *
         * appointment.doctor_id is the USER ID, which is what
         * appointments uses.
         */

        const dateString = formatDateForDatabase(selectedDate)

        const startOfDay = `${dateString}T00:00:00`
        const endOfDay = `${dateString}T23:59:59.999`

        const { data: bookedAppointments, error: bookedError } =
          await supabase
            .from('appointments')
            .select(
              'id, starts_at, ends_at, status'
            )
            .eq('doctor_id', appointment.doctor_id)
            .neq('id', appointment.id)
            .in('status', [
              'confirmed',
              'pending_payment',
              'payment_processing',
            ])
            .gte('starts_at', startOfDay)
            .lte('starts_at', endOfDay)

        if (bookedError) {
          console.error(
            'Error fetching booked appointments:',
            bookedError
          )

          throw new Error(
            bookedError.message ||
              'Failed to check appointment availability'
          )
        }

        console.log(
          'Booked appointments:',
          bookedAppointments
        )

        /*
         * Convert schedule start/end into Date objects.
         */

        const [startHour, startMinute] =
          schedule.start_time.split(':').map(Number)

        const [endHour, endMinute] =
          schedule.end_time.split(':').map(Number)

        const scheduleStart = new Date(selectedDate)
        scheduleStart.setHours(
          startHour,
          startMinute,
          0,
          0
        )

        const scheduleEnd = new Date(selectedDate)
        scheduleEnd.setHours(
          endHour,
          endMinute,
          0,
          0
        )

        const duration =
          Number(schedule.slot_duration) || 30

        const generatedSlots: TimeSlot[] = []

        let slotStart = new Date(scheduleStart)

        const now = new Date()

        while (slotStart < scheduleEnd) {
          const slotEnd = new Date(
            slotStart.getTime() +
              duration * 60 * 1000
          )

          /*
           * Don't create a slot that goes beyond the doctor's
           * working hours.
           */
          if (slotEnd > scheduleEnd) {
            break
          }

          /*
           * If selected date is today, don't show past slots.
           */
          const isPastTime =
            isSameDay(selectedDate, now) &&
            slotStart <= now

          /*
           * Check whether this slot overlaps another appointment.
           */
          const overlapsAppointment =
            bookedAppointments?.some((booked) => {
              const bookedStart = new Date(
                booked.starts_at
              )

              const bookedEnd = new Date(
                booked.ends_at
              )

              return (
                slotStart < bookedEnd &&
                slotEnd > bookedStart
              )
            }) ?? false

          generatedSlots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
            available:
              !isPastTime &&
              !overlapsAppointment,
          })

          slotStart = slotEnd
        }

        console.log(
          'Generated time slots:',
          generatedSlots
        )

        setTimeSlots(generatedSlots)
      } catch (err) {
        console.error(
          'Error generating time slots:',
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to generate available times'
        )

        setTimeSlots([])
      } finally {
        setSlotsLoading(false)
      }
    }

    generateTimeSlots()
  }, [
    selectedDate,
    appointment,
    schedules,
    supabase,
  ])

  /*
   * ---------------------------------------------------------
   * Available dates
   * ---------------------------------------------------------
   */

  const availableDates = useMemo(() => {
    if (schedules.length === 0) {
      return []
    }

    const dates: Date[] = []

    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)

    /*
     * Look ahead 60 days.
     */
    for (let i = 0; i < 60; i++) {
      const date = new Date(startDate)

      date.setDate(
        startDate.getDate() + i
      )

      const weekday =
        DAYS_OF_WEEK[date.getDay()]

      const hasSchedule = schedules.some(
        (schedule) =>
          schedule.active &&
          schedule.weekday.toLowerCase() ===
            weekday
      )

      if (hasSchedule) {
        dates.push(date)
      }
    }

    console.log(
      'Available dates:',
      dates
    )

    return dates
  }, [schedules])

  /*
   * ---------------------------------------------------------
   * Calendar
   * ---------------------------------------------------------
   */

  const calendarDays = useMemo(() => {
    const year =
      currentMonth.getFullYear()

    const month =
      currentMonth.getMonth()

    const firstDay = new Date(
      year,
      month,
      1
    )

    const lastDay = new Date(
      year,
      month + 1,
      0
    )

    const days: (Date | null)[] = []

    /*
     * Sunday = 0.
     */
    for (
      let i = 0;
      i < firstDay.getDay();
      i++
    ) {
      days.push(null)
    }

    for (
      let day = 1;
      day <= lastDay.getDate();
      day++
    ) {
      days.push(
        new Date(
          year,
          month,
          day
        )
      )
    }

    return days
  }, [currentMonth])

  const isDateAvailable = (
    date: Date
  ) => {
    return availableDates.some(
      (availableDate) =>
        isSameDay(
          availableDate,
          date
        )
    )
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    )
  }

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    )
  }

  /*
   * ---------------------------------------------------------
   * Select date
   * ---------------------------------------------------------
   */

  const handleDateSelect = (
    date: Date
  ) => {
    if (
      isPastDate(date) ||
      !isDateAvailable(date)
    ) {
      return
    }

    setSelectedDate(date)
    setSelectedSlot(null)
    setError('')
    setSuccess('')
  }

  /*
   * ---------------------------------------------------------
   * Reschedule
   * ---------------------------------------------------------
   */

  const handleReschedule = async () => {
    if (
      !appointment ||
      !selectedDate ||
      !selectedSlot
    ) {
      return
    }

    try {
      setRescheduling(true)
      setError('')
      setSuccess('')

      const newStart = selectedSlot.start
      const newEnd = selectedSlot.end

      console.log(
        'Rescheduling appointment:',
        appointment.id
      )

      console.log(
        'New start:',
        newStart.toISOString()
      )

      console.log(
        'New end:',
        newEnd.toISOString()
      )

      /*
       * Final availability check before updating.
       *
       * This is important because another patient may have
       * booked the slot while this page was open.
       */

      const { data: conflictingAppointments, error: conflictError } =
        await supabase
          .from('appointments')
          .select(
            'id, starts_at, ends_at, status'
          )
          .eq(
            'doctor_id',
            appointment.doctor_id
          )
          .neq(
            'id',
            appointment.id
          )
          .in('status', [
            'confirmed',
            'pending_payment',
            'payment_processing',
          ])
          .lt(
            'starts_at',
            newEnd.toISOString()
          )
          .gt(
            'ends_at',
            newStart.toISOString()
          )

      if (conflictError) {
        throw new Error(
          conflictError.message
        )
      }

      if (
        conflictingAppointments &&
        conflictingAppointments.length > 0
      ) {
        throw new Error(
          'This time slot has just been booked. Please choose another time.'
        )
      }

      /*
       * Update appointment.
       *
       * We preserve the current appointment status here.
       */

      const { error: updateError } =
        await supabase
          .from('appointments')
          .update({
            starts_at:
              newStart.toISOString(),
            ends_at:
              newEnd.toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            appointment.id
          )
          .eq(
            'patient_id',
            user?.id
          )

      if (updateError) {
        console.error(
          'Reschedule update error:',
          updateError
        )

        throw new Error(
          updateError.message ||
            'Failed to reschedule appointment'
        )
      }

      setSuccess(
        'Your appointment has been rescheduled successfully.'
      )

      /*
       * Give the user a moment to see the success message.
       */
      setTimeout(() => {
        router.push(
          `/patient/appointments/${appointment.id}`
        )
      }, 1500)
    } catch (err) {
      console.error(
        'Reschedule error:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to reschedule appointment'
      )
    } finally {
      setRescheduling(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * Loading states
   * ---------------------------------------------------------
   */

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />

          <p className="mt-3 text-gray-600">
            Loading appointment...
          </p>
        </div>
      </div>
    )
  }

  /*
   * ---------------------------------------------------------
   * Error state
   * ---------------------------------------------------------
   */

  if (
    error &&
    !appointment
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />

          <h2 className="text-xl font-semibold text-gray-900 mt-4">
            Unable to load appointment
          </h2>

          <p className="text-gray-600 mt-2">
            {error}
          </p>

          <Link
            href="/patient/appointments"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to appointments
          </Link>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return null
  }

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/patient/appointments/${appointment.id}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to appointment
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">
            Reschedule Appointment
          </h1>

          <p className="text-gray-600 mt-2">
            Choose a new date and time for your appointment.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />

            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />

            <p>{success}</p>
          </div>
        )}

        {/* Appointment information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-4">
            {appointment.doctor_user?.avatar_url ? (
              <img
                src={
                  appointment.doctor_user.avatar_url
                }
                alt={
                  appointment.doctor_user.full_name
                }
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl font-semibold text-blue-600">
                  {appointment.doctor_user?.full_name
                    ?.charAt(0)
                    ?.toUpperCase() || 'D'}
                </span>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500">
                Doctor
              </p>

              <h2 className="text-lg font-semibold text-gray-900">
                {appointment.doctor_user?.full_name ||
                  'Doctor'}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Current appointment:{' '}
                {new Date(
                  appointment.starts_at
                ).toLocaleDateString(
                  undefined,
                  {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }
                )}{' '}
                at{' '}
                {formatTime(
                  new Date(
                    appointment.starts_at
                  )
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />

                <h2 className="text-lg font-semibold text-gray-900">
                  Select a date
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="font-medium text-gray-900 min-w-[140px] text-center">
                  {MONTH_NAMES[
                    currentMonth.getMonth()
                  ]}{' '}
                  {currentMonth.getFullYear()}
                </span>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekday headings */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAY_LABELS.map(
                (day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-gray-500 py-2"
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(
                (date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="h-11"
                      />
                    )
                  }

                  const available =
                    isDateAvailable(
                      date
                    )

                  const past =
                    isPastDate(date)

                  const selected =
                    selectedDate &&
                    isSameDay(
                      selectedDate,
                      date
                    )

                  const current =
                    isSameDay(
                      new Date(),
                      date
                    )

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={
                        !available ||
                        past
                      }
                      onClick={() =>
                        handleDateSelect(
                          date
                        )
                      }
                      className={`
                        h-11 rounded-lg text-sm font-medium transition
                        ${
                          selected
                            ? 'bg-blue-600 text-white'
                            : available &&
                              !past
                            ? 'hover:bg-blue-50 text-gray-900'
                            : 'text-gray-300 cursor-not-allowed'
                        }
                        ${
                          current &&
                          !selected
                            ? 'ring-1 ring-blue-600'
                            : ''
                        }
                      `}
                    >
                      {date.getDate()}
                    </button>
                  )
                }
              )}
            </div>

            <div className="mt-5 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                Selected
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-blue-600" />
                Today
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-200" />
                Unavailable
              </div>
            </div>
          </div>

          {/* Time slots */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-blue-600" />

              <h2 className="text-lg font-semibold text-gray-900">
                Select a time
              </h2>
            </div>

            {!selectedDate ? (
              <div className="text-center py-10">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto" />

                <p className="text-gray-500 mt-3">
                  Select a date first.
                </p>
              </div>
            ) : slotsLoading ? (
              <div className="text-center py-10">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto" />

                <p className="text-gray-500 mt-3">
                  Checking availability...
                </p>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-10 h-10 text-gray-300 mx-auto" />

                <p className="font-medium text-gray-700 mt-3">
                  No available times
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Please choose another date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[430px] overflow-y-auto">
                {timeSlots.map(
                  (slot) => {
                    const selected =
                      selectedSlot?.start.getTime() ===
                      slot.start.getTime()

                    return (
                      <button
                        key={slot.start.toISOString()}
                        type="button"
                        disabled={
                          !slot.available
                        }
                        onClick={() =>
                          setSelectedSlot(
                            slot
                          )
                        }
                        className={`
                          px-3 py-3 rounded-lg border text-sm font-medium transition
                          ${
                            selected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : slot.available
                              ? 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-800'
                              : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                          }
                        `}
                      >
                        {formatTime(
                          slot.start
                        )}
                      </button>
                    )
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom summary */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div>
              <h3 className="font-semibold text-gray-900">
                New appointment time
              </h3>

              {selectedDate &&
              selectedSlot ? (
                <div className="mt-2 text-gray-600">
                  <span className="font-medium text-gray-900">
                    {selectedDate.toLocaleDateString(
                      undefined,
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </span>

                  <span className="mx-2">
                    •
                  </span>

                  <span>
                    {formatTime(
                      selectedSlot.start
                    )}{' '}
                    -{' '}
                    {formatTime(
                      selectedSlot.end
                    )}
                  </span>
                </div>
              ) : (
                <p className="text-gray-500 mt-2">
                  Select a date and available time.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={
                !selectedDate ||
                !selectedSlot ||
                rescheduling
              }
              onClick={
                handleReschedule
              }
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {rescheduling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Reschedule Appointment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}