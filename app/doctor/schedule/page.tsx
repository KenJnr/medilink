// app/doctor/schedule/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Schedule {
  id: string
  weekday: string
  start_time: string
  end_time: string
  slot_duration: number
  active: boolean
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function DoctorSchedulePage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null)

  const [schedules, setSchedules] = useState<Schedule[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchDoctorProfile()
    }
  }, [user, authLoading])

  const fetchDoctorProfile = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching doctor profile:', error)
      if (error.code === 'PGRST116') {
        router.push('/doctor/profile')
      }
      return
    }

    if (data) {
      setDoctorProfileId(data.id)
      fetchSchedules(data.id)
    }
  }

  const fetchSchedules = async (profileId: string) => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', profileId)
        .order('weekday', { ascending: true })

      if (error) throw error

      // Fill in missing days
      const existingDays = data?.map((s: Schedule) => s.weekday) || []
      const allSchedules: Schedule[] = []

      DAYS.forEach((day) => {
        const existing = data?.find((s: Schedule) => s.weekday === day)
        if (existing) {
          allSchedules.push(existing)
        } else {
          allSchedules.push({
            id: '',
            weekday: day,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration: 30,
            active: false,
          })
        }
      })

      setSchedules(allSchedules)
    } catch (error: any) {
      console.error('Error fetching schedules:', error)
      setError(error.message || 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleChange = (index: number, field: keyof Schedule, value: any) => {
    const updated = [...schedules]
    updated[index] = { ...updated[index], [field]: value }
    setSchedules(updated)
  }

  const handleSave = async () => {
    if (!doctorProfileId) {
      setError('Please save your profile first')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const activeSchedules = schedules.filter((s) => s.active)

      // Delete existing schedules first
      const { error: deleteError } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('doctor_id', doctorProfileId)

      if (deleteError) throw deleteError

      // Insert new schedules
      if (activeSchedules.length > 0) {
        const schedulesToInsert = activeSchedules.map((s) => ({
          doctor_id: doctorProfileId,
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time,
          slot_duration: s.slot_duration,
          active: true,
        }))

        const { error: insertError } = await supabase
          .from('doctor_schedules')
          .insert(schedulesToInsert)

        if (insertError) throw insertError
      }

      setSuccess('Schedule updated successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (error: any) {
      console.error('Error saving schedules:', error)
      setError(error.message || 'Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading schedule...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/doctor" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Schedule</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/doctor" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Working Hours</h1>
            <p className="text-sm text-gray-500">Set your weekly availability for appointments</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <div className="space-y-4">
              {schedules.map((schedule, index) => (
                <div
                  key={schedule.weekday}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 sm:w-32">
                    <input
                      type="checkbox"
                      checked={schedule.active}
                      onChange={(e) => handleScheduleChange(index, 'active', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900 text-sm">
                      {DAY_LABELS[DAYS.indexOf(schedule.weekday)]}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Start</label>
                      <input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                        disabled={!schedule.active}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          schedule.active ? 'border-gray-300 text-gray-900' : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">End</label>
                      <input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                        disabled={!schedule.active}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          schedule.active ? 'border-gray-300 text-gray-900' : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                      />
                    </div>

                    <div className="w-32">
                      <label className="block text-xs text-gray-500 mb-1">Slot (min)</label>
                      <select
                        value={schedule.slot_duration}
                        onChange={(e) => handleScheduleChange(index, 'slot_duration', parseInt(e.target.value))}
                        disabled={!schedule.active}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          schedule.active ? 'border-gray-300 text-gray-900' : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                      >
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                        <option value="60">60</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}