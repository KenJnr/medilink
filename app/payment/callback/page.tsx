'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function PaymentCallback() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')
  const reference = searchParams.get('reference')

  useEffect(() => {
    if (reference) {
      verifyAndUpdatePayment(reference)
    } else {
      setStatus('failed')
      setMessage('No payment reference found')
    }
  }, [reference])

  const verifyAndUpdatePayment = async (ref: string) => {
    try {
      // 1. Verify payment with Paystack
      const response = await fetch(`/api/paystack/verify?reference=${ref}`)
      const data = await response.json()

      if (data.status === 'success') {
        // 2. Get the appointment ID from the transaction
        const appointmentId = data.transaction?.metadata?.appointment_id

        if (appointmentId) {
          // 3. Update appointment status directly in database
          const { error: appointmentError } = await supabase
            .from('appointments')
            .update({
              status: 'confirmed',
              payment_reference: ref,
              payment_status: 'paid',
            })
            .eq('id', appointmentId)

          if (appointmentError) {
            console.error('Failed to update appointment:', appointmentError)
            setStatus('failed')
            setMessage('Payment verified but failed to update appointment')
            return
          }

          // 4. Update payment record
          const { error: paymentError } = await supabase
            .from('payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              provider_payment_id: ref,
              provider: 'paystack',
            })
            .eq('appointment_id', appointmentId)

          if (paymentError) {
            console.error('Failed to update payment:', paymentError)
          }

          console.log('✅ Appointment and payment updated successfully!')
        }

        setStatus('success')
        setMessage('Your appointment has been confirmed!')
        
        setTimeout(() => {
          router.push('/patient/appointments')
        }, 3000)
      } else {
        setStatus('failed')
        setMessage(data.message || 'Payment verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setStatus('failed')
      setMessage('Failed to verify payment')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Verifying Payment...</h2>
            <p className="text-gray-500 mt-1">Please wait while we confirm your payment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Payment Successful!</h2>
            <p className="text-gray-600 mt-1">{message}</p>
            <Link
              href="/patient/appointments"
              className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Appointments
            </Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Payment Failed</h2>
            <p className="text-gray-600 mt-1">{message}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Link
                href="/patient/payments"
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go Back
              </Link>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}