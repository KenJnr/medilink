// components/payment/PaymentCard.tsx
'use client'

import Link from 'next/link'

interface PaymentCardProps {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  doctorName: string
  specialty: string
  date: string
  avatarUrl?: string | null
  onPay?: () => void
}

export default function PaymentCard({
  id,
  amount,
  currency,
  status,
  doctorName,
  specialty,
  date,
  avatarUrl,
  onPay,
}: PaymentCardProps) {
  const statusStyles = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  const statusLabels = {
    pending: 'Pending',
    processing: 'Processing',
    paid: 'Paid ',
    failed: 'Failed ',
    refunded: 'Refunded',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Doctor info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm flex-shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={doctorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                doctorName?.charAt(0) || 'D'
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Dr. {doctorName || 'Unknown'}</h3>
              <p className="text-sm text-gray-500">{specialty || 'General Medicine'}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Right: Amount and status */}
        <div className="flex flex-col items-end gap-2 sm:ml-4">
          <p className="text-lg font-bold text-gray-900">
            {currency} {amount.toFixed(2)}
          </p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
            {statusLabels[status]}
          </span>

          {/* Action buttons */}
          {status === 'pending' && onPay && (
            <button
              onClick={onPay}
              className="mt-2 px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Pay Now
            </button>
          )}
          {status === 'paid' && (
            <Link
              href={`/patient/payments/${id}`}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              View Receipt →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}