'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
   onConfirm?: () => Promise<void>  // ✅ Make optional
  currency: string
  doctorName: string
  appointmentId: string
  doctorId: string
  onSuccess?: () => void
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  currency,
  doctorName,
  appointmentId,
  doctorId,
  onSuccess,
}: PaymentModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handlePayWithPaystack = async () => {
    if (!user) {
      setError('Please login to continue')
      return
    }

    // ✅ Debug: Log what we're sending
    console.log('Payment data:', {
      email: user.email,
      amount: amount,
      appointmentId: appointmentId,
      doctorId: doctorId,
      patientId: user.id,
    })

    setLoading(true)
    setError('')

    try {
      // 1. Initialize payment with Paystack
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amount,
          appointmentId: appointmentId,
          doctorId: doctorId,
          patientId: user.id,
        }),
      })

      const data = await response.json()
      console.log('API Response:', data)  // ✅ Debug

      if (!response.ok) {
        throw new Error(data.message || 'Payment initialization failed')
      }

      // 2. Redirect to Paystack payment page
      window.location.href = data.authorization_url

      // 3. Call onSuccess if provided (will be called after redirect)
      if (onSuccess) onSuccess()

    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.message || 'Payment failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
          <p className="text-sm text-gray-500 mt-1">
            You are about to pay for your appointment
          </p>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Doctor</span>
              <span className="font-medium text-gray-900">Dr. {doctorName}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-900">
                {currency} {amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Appointment</span>
              <span className="font-medium text-gray-900">#{appointmentId?.slice(0, 8) || 'N/A'}</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePayWithPaystack}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay with Paystack'
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <p className="text-xs text-gray-400">
              Secured payment via Paystack. You will receive a confirmation email.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}