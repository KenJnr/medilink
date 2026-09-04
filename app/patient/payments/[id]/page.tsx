// app/patient/payments/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PaymentDetail {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  provider_payment_id: string | null
  paid_at: string | null
  created_at: string
  appointment_id: string
  appointment: {
    id: string
    starts_at: string
    ends_at: string
    doctor_profiles: {
      users: {
        full_name: string
      }
      specialties: {
        name: string
      }
    }
  }
}

export default function PaymentDetailPage() {
  const params = useParams()
  const paymentId = params.id as string
  const [payment, setPayment] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPayment()
  }, [paymentId])

  const fetchPayment = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          appointment:appointment_id (
            id,
            starts_at,
            ends_at,
            doctor_profiles:doctor_id (
              users:user_id (
                full_name
              ),
              specialties:specialty_id (
                name
              )
            )
          )
        `)
        .eq('id', paymentId)
        .single()

      if (error) throw error
      setPayment(data)
    } catch (error) {
      console.error('Error fetching payment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Payment not found</h1>
          <Link href="/patient/payments" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to payments
          </Link>
        </div>
      </div>
    )
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  }

  const statusLabels = {
    pending: 'Pending',
    processing: 'Processing',
    paid: 'Paid ✅',
    failed: 'Failed ❌',
    refunded: 'Refunded',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/patient" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Payment Receipt</span>
            </div>
            <Link href="/patient/payments" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">Payment Receipt</h1>
                <p className="text-blue-100 text-sm">#{payment.id.slice(0, 8)}</p>
              </div>
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${statusColors[payment.status]}`}>
                {statusLabels[payment.status]}
              </span>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {payment.currency} {payment.amount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(payment.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Doctor</p>
                <p className="font-medium text-gray-900">
                  Dr. {payment.appointment?.doctor_profiles?.users?.full_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Specialty</p>
                <p className="font-medium text-gray-900">
                  {payment.appointment?.doctor_profiles?.specialties?.name || 'General Medicine'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Appointment</p>
                <p className="font-medium text-gray-900">
                  {new Date(payment.appointment?.starts_at).toLocaleDateString()} at{' '}
                  {new Date(payment.appointment?.starts_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900">Mock Payment (Demo)</p>
              </div>
            </div>

            {payment.paid_at && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Payment completed on {new Date(payment.paid_at).toLocaleString()}
                </p>
              </div>
            )}

            {payment.status === 'pending' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                 This payment is pending. Please complete the payment process.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 flex gap-3">
              <Link
                href="/patient"
                className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}