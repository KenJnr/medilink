// components/payment/PaymentModal.tsx
'use client'

import { useState } from 'react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  amount: number
  currency: string
  doctorName: string
  appointmentId: string
}

export default function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  currency,
  doctorName,
  appointmentId,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
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
              <span className="font-medium text-gray-900">#{appointmentId.slice(0, 8)}</span>
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
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Payment'
              )}
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-400">
             Secured payment. You will receive a confirmation email.
          </p>
        </div>
      </div>
    </div>
  )
}