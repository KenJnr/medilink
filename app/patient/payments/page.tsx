// app/patient/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import PaymentCard from '@/components/payment/PaymentCard'
import PaymentModal from '@/components/payment/PaymentModal'

interface PaymentWithAppointment {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  paid_at: string | null
  created_at: string
  appointment_id: string
  appointment: {
    id: string
    starts_at: string
    fee: number
    currency: string
    doctor_id: string
    doctor: {
      full_name: string
      avatar_url: string | null
    }
    specialty: string
  }
}

interface PaymentStats {
  total_paid: number
  total_pending: number
  total_earnings: number
}

export default function PatientPaymentsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const [payments, setPayments] = useState<PaymentWithAppointment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    total_paid: 0,
    total_pending: 0,
    total_earnings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithAppointment | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchPayments()
    }
  }, [user])

  const fetchPayments = async () => {
    if (!user) return

    setLoading(true)
    try {
      await syncPendingPayments()

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([])
        setStats({ total_paid: 0, total_pending: 0, total_earnings: 0 })
        setLoading(false)
        return
      }

      const appointmentIds = paymentsData.map((p: any) => p.appointment_id).filter(Boolean)
      
      let appointmentsMap: Record<string, any> = {}
      if (appointmentIds.length > 0) {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .in('id', appointmentIds)

        if (!appointmentsError && appointmentsData) {
          appointmentsMap = appointmentsData.reduce((acc: Record<string, any>, app: any) => {
            acc[app.id] = app
            return acc
          }, {})
        }
      }

      const doctorIds = Object.values(appointmentsMap)
        .map((app: any) => app.doctor_id)
        .filter(Boolean)

      let usersMap: Record<string, any> = {}
      let doctorProfilesMap: Record<string, any> = {}

      if (doctorIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', doctorIds)

        if (!usersError && usersData) {
          usersMap = usersData.reduce((acc: Record<string, any>, u: any) => {
            acc[u.id] = u
            return acc
          }, {})
        }

        const { data: doctorProfiles, error: profilesError } = await supabase
          .from('doctor_profiles')
          .select('user_id, specialty_id')
          .in('user_id', doctorIds)

        if (!profilesError && doctorProfiles) {
          const specialtyIds = doctorProfiles
            .map((dp: any) => dp.specialty_id)
            .filter(Boolean)

          let specialtiesMap: Record<string, string> = {}
          if (specialtyIds.length > 0) {
            const { data: specialties, error: specialtiesError } = await supabase
              .from('specialties')
              .select('id, name')
              .in('id', specialtyIds)

            if (!specialtiesError && specialties) {
              specialtiesMap = specialties.reduce((acc: Record<string, string>, s: any) => {
                acc[s.id] = s.name
                return acc
              }, {})
            }
          }

          doctorProfilesMap = doctorProfiles.reduce((acc: Record<string, any>, dp: any) => {
            acc[dp.user_id] = {
              specialty: specialtiesMap[dp.specialty_id] || 'General Medicine',
            }
            return acc
          }, {})
        }
      }

      const combinedData: PaymentWithAppointment[] = paymentsData.map((payment: any) => {
        const appointment = appointmentsMap[payment.appointment_id] || {}
        const doctorUser = usersMap[appointment.doctor_id] || {}
        const doctorProfile = doctorProfilesMap[appointment.doctor_id] || {}
        
        return {
          ...payment,
          appointment: {
            id: appointment.id || '',
            starts_at: appointment.starts_at || '',
            fee: appointment.fee || 0,
            currency: appointment.currency || 'GHS',
            doctor_id: appointment.doctor_id || '',
            doctor: {
              full_name: doctorUser.full_name || 'Unknown',
              avatar_url: doctorUser.avatar_url || null,
            },
            specialty: doctorProfile.specialty || 'General Medicine',
          }
        }
      })

      setPayments(combinedData)

      const paid = combinedData.filter((p: any) => p.status === 'paid')
      const pending = combinedData.filter((p: any) => p.status === 'pending')
      
      setStats({
        total_paid: paid.length,
        total_pending: pending.length,
        total_earnings: paid.reduce((sum: number, p: any) => sum + p.amount, 0),
      })

    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const syncPendingPayments = async () => {
    if (!user) return

    setSyncing(true)

    try {
      const { data: pendingAppointments, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, fee, currency')
        .eq('patient_id', user.id)
        .eq('status', 'pending_payment')

      if (appointmentError) throw appointmentError

      if (!pendingAppointments || pendingAppointments.length === 0) {
        return
      }

      const appointmentIds = pendingAppointments.map((app: any) => app.id)
      
      const { data: existingPayments, error: paymentError } = await supabase
        .from('payments')
        .select('appointment_id')
        .in('appointment_id', appointmentIds)

      if (paymentError) throw paymentError

      const existingAppointmentIds = new Set(
        existingPayments?.map((p: any) => p.appointment_id) || []
      )

      const appointmentsToSync = pendingAppointments.filter(
        (app: any) => !existingAppointmentIds.has(app.id)
      )

      if (appointmentsToSync.length === 0) {
        return
      }

      const paymentsToCreate = appointmentsToSync.map((app: any) => ({
        appointment_id: app.id,
        amount: app.fee || 0,
        currency: app.currency || 'GHS',
        status: 'pending',
        provider: 'mock',
        created_at: new Date().toISOString(),
      }))
      
      const { error: insertError } = await supabase
        .from('payments')
        .insert(paymentsToCreate)

      if (insertError) {
        console.error('Error creating payments:', insertError)
      }
    } catch (error) {
      console.error('Error syncing pending payments:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handlePayNow = (payment: PaymentWithAppointment) => {
    setSelectedPayment(payment)
    setShowPaymentModal(true)
  }

  const handlePaymentConfirm = async () => {
    if (!selectedPayment) return

    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          provider_payment_id: `mock_${Date.now()}`,
        })
        .eq('id', selectedPayment.id)

      if (error) throw error

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', selectedPayment.appointment_id)

      if (appointmentError) throw appointmentError

      await fetchPayments()
      setShowPaymentModal(false)
      setSelectedPayment(null)

      alert('Payment successful! Your appointment is now confirmed. ✅')

    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
    }
  }

  if (authLoading || loading || syncing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">
            {syncing ? 'Syncing payments...' : 'Loading payments...'}
          </p>
        </div>
      </div>
    )
  }

  // Stats items with gradients matching the StatCards component
  const statsItems = [
    { 
      label: 'Pending Payments', 
      value: stats.total_pending, 
      indicatorColor: 'bg-yellow-400',
      gradient: 'from-blue-700 to-blue-500'
    },
    { 
      label: 'Completed', 
      value: stats.total_paid, 
      indicatorColor: 'bg-emerald-500',
      gradient: 'from-blue-700 to-blue-500'
    },
    { 
      label: 'Total Spent', 
      value: `GHS ${stats.total_earnings.toFixed(2)}`, 
      indicatorColor: 'bg-purple-400',
      gradient: 'from-blue-700 to-blue-500'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/patient" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Payments</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/patient" 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">Manage your payments and view history</p>
        </div>

        {/* Stats Cards - Same style as StatCards component */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {statsItems.map((item) => (
            <div 
              key={item.label} 
              className={`bg-gradient-to-br ${item.gradient} rounded-xl px-4 py-6 shadow-sm relative overflow-hidden`}
            >
              {/* Circular Indicator - Top Right */}
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full">
                <div className={`w-full h-full rounded-full ${item.indicatorColor}`} />
              </div>
              
              <p className="text-xs text-white/70 mb-1 relative z-10">{item.label}</p>
              <p className="text-xl font-medium text-white relative z-10">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {payments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No payments yet</p>
            <Link
              href="/doctors"
              className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Find a doctor →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                id={payment.id}
                amount={payment.amount}
                currency={payment.currency}
                status={payment.status}
                doctorName={payment.appointment?.doctor?.full_name || 'Unknown'}
                specialty={payment.appointment?.specialty || 'General Medicine'}
                date={payment.created_at}
                avatarUrl={payment.appointment?.doctor?.avatar_url || null}
                onPay={payment.status === 'pending' ? () => handlePayNow(payment) : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {selectedPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedPayment(null)
          }}
          onConfirm={handlePaymentConfirm}
          amount={selectedPayment.amount}
          currency={selectedPayment.currency}
          doctorName={selectedPayment.appointment?.doctor?.full_name || 'Unknown'}
          appointmentId={selectedPayment.appointment_id}
        />
      )}
    </div>
  )
}