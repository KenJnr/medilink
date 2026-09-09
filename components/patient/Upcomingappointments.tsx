// components/patient/UpcomingAppointments.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, Video, CalendarClock, CreditCard } from 'lucide-react'
import type { Appointment } from '@/lib/types/patient-dashboard'
import { getStatusBadge } from '@/lib/appointment-status'
import { createClient } from '@/lib/supabase/client'
import PaymentModal from '@/components/payment/PaymentModal'
import VideoCallButton from '@/components/video/VideoCallButton'

interface UpcomingAppointmentsProps {
  appointments?: Appointment[]
}

export default function UpcomingAppointments({ appointments: propAppointments }: UpcomingAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (propAppointments && propAppointments.length > 0) {
      setAppointments(propAppointments)
      setLoading(false)
      return
    }

    fetchUpcomingAppointments()
  }, [propAppointments])

  const fetchUpcomingAppointments = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAppointments([])
        setLoading(false)
        return
      }

      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor_user:doctor_id (
            full_name,
            avatar_url
          )
        `)
        .eq('patient_id', user.id)
        .in('status', ['confirmed', 'pending_payment'])
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(4)

      if (error) throw error

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([])
        setLoading(false)
        return
      }

      const doctorIds = appointmentsData.map((app: any) => app.doctor_id)
      
      const { data: doctorProfiles, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('user_id, consultation_fee, specialty_id')
        .in('user_id', doctorIds)

      if (profileError) throw profileError

      const specialtyIds = doctorProfiles?.map((dp: any) => dp.specialty_id).filter(Boolean) || []
      let specialtiesMap: Record<string, string> = {}
      
      if (specialtyIds.length > 0) {
        const { data: specialties, error: specialtyError } = await supabase
          .from('specialties')
          .select('id, name')
          .in('id', specialtyIds)

        if (!specialtyError && specialties) {
          specialtiesMap = specialties.reduce((acc: Record<string, string>, s: any) => {
            acc[s.id] = s.name
            return acc
          }, {})
        }
      }

      const userSpecialtyMap: Record<string, string> = {}
      const userFeeMap: Record<string, number> = {}
      const userAvatarMap: Record<string, string | null> = {}
      
      doctorProfiles?.forEach((dp: any) => {
        if (dp.user_id) {
          userSpecialtyMap[dp.user_id] = specialtiesMap[dp.specialty_id] || 'General Medicine'
          userFeeMap[dp.user_id] = dp.consultation_fee || 0
        }
      })

      appointmentsData.forEach((app: any) => {
        if (app.doctor_user?.avatar_url) {
          userAvatarMap[app.doctor_id] = app.doctor_user.avatar_url
        }
      })

      const transformedData: Appointment[] = appointmentsData.map((app: any) => {
        const doctorUser = app.doctor_user || {}
        
        return {
          id: app.id,
          starts_at: app.starts_at,
          ends_at: app.ends_at,
          status: app.status,
          consultation_type: app.consultation_type,
          fee: app.fee,
          currency: app.currency,
          reason: app.reason,
          notes: app.notes,
          doctor_id: app.doctor_id,        // ✅ Added
          patient_id: app.patient_id,      // ✅ Added
          doctor_profiles: {
            users: {
              full_name: doctorUser.full_name || 'Unknown',
              avatar_url: userAvatarMap[app.doctor_id] || doctorUser.avatar_url || null,
            },
            specialties: {
              name: userSpecialtyMap[app.doctor_id] || 'General Medicine',
            },
            consultation_fee: userFeeMap[app.doctor_id] || 0,
          }
        }
      })

      setAppointments(transformedData)
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = (appointmentId: string) => {
    window.location.href = `/patient/appointments/${appointmentId}/reschedule`
  }

  const handlePayNow = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowPaymentModal(true)
  }

  const handlePaymentConfirm = async () => {
    if (!selectedAppointment) return

    setProcessingPayment(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          provider_payment_id: `mock_${Date.now()}`,
        })
        .eq('appointment_id', selectedAppointment.id)

      if (paymentError) throw paymentError

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', selectedAppointment.id)

      if (appointmentError) throw appointmentError

      await fetchUpcomingAppointments()
      setShowPaymentModal(false)
      setSelectedAppointment(null)

      alert('Payment successful! Your appointment is now confirmed. ✅')

    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Upcoming appointments</h2>
          <Link href="/patient/appointments" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
        <div className="p-4">
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  const displayAppointments = appointments

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Upcoming appointments</h2>
        <Link href="/patient/appointments" className="text-sm text-blue-600 hover:text-blue-700">
          View all
        </Link>
      </div>

      <div className="p-4">
        {displayAppointments.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No upcoming appointments</p>
            <Link
              href="/doctors"
              className="inline-block mt-2 text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Find a doctor
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAppointments.map((appointment) => {
              const status = getStatusBadge(appointment.status)
              const doctorName = appointment.doctor_profiles?.users?.full_name || 'Unknown'
              const specialty = appointment.doctor_profiles?.specialties?.name || 'General medicine'
              const avatarUrl = appointment.doctor_profiles?.users?.avatar_url || null
              const date = new Date(appointment.starts_at)
              const isConfirmed = appointment.status === 'confirmed'
              const isPending = appointment.status === 'pending_payment'

              return (
                <div
                  key={appointment.id}
                  className="flex flex-col p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  {/* Top row: Doctor info and status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm flex-shrink-0 overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={doctorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          doctorName.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Dr. {doctorName}</p>
                        <p className="text-xs text-gray-500">{specialty}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={13} />
                            {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isPending && (
                            <span className="font-medium text-amber-600">
                              GHS {appointment.doctor_profiles?.consultation_fee || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-13 sm:pl-0">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: Action buttons */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3">
                    {isConfirmed && (
                      <>
                        <button
                          onClick={() => handleReschedule(appointment.id)}
                          className="inline-flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors flex-1 sm:flex-none min-w-[120px]"
                        >
                          <CalendarClock size={16} />
                          Reschedule
                        </button>
                        
                        <VideoCallButton 
                          appointmentId={appointment.id}
                          doctorId={appointment.doctor_id}
                          patientId={appointment.patient_id}
                          role="patient"
                          className="flex-1 sm:flex-none min-w-[120px] bg-black/80 hover:bg-black"
                        />
                      </>
                    )}

                    {isPending && (
                      <button
                        onClick={() => handlePayNow(appointment)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex-1 sm:flex-none min-w-[140px]"
                      >
                        <CreditCard size={16} />
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedAppointment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedAppointment(null)
          }}
          amount={selectedAppointment.fee || selectedAppointment.doctor_profiles?.consultation_fee || 0}
          currency={selectedAppointment.currency || 'GHS'}
          doctorName={selectedAppointment.doctor_profiles?.users?.full_name || 'Unknown'}
          appointmentId={selectedAppointment.id}
          doctorId={selectedAppointment.doctor_id}
          onSuccess={() => {
            console.log('Payment initiated successfully')
          }}
        />
      )}
    </div>
  )
}