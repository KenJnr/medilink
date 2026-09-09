'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Eye,
  Calendar,
  User,
  Stethoscope,
  CreditCard
} from 'lucide-react'

interface PaymentCardProps {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  doctorName: string
  specialty: string
  date: string
  avatarUrl: string | null
  onPay?: () => void
  onViewReceipt?: () => void
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
  onViewReceipt,
}: PaymentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return { 
          label: 'Paid', 
          color: 'text-green-700 bg-green-50 border-green-200',
          icon: <CheckCircle className="w-4 h-4 text-green-500" />
        }
      case 'pending':
        return { 
          label: 'Pending', 
          color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
          icon: <Clock className="w-4 h-4 text-yellow-500" />
        }
      case 'failed':
        return { 
          label: 'Failed', 
          color: 'text-red-700 bg-red-50 border-red-200',
          icon: <XCircle className="w-4 h-4 text-red-500" />
        }
      case 'refunded':
        return { 
          label: 'Refunded', 
          color: 'text-gray-700 bg-gray-50 border-gray-200',
          icon: <RefreshCw className="w-4 h-4 text-gray-500" />
        }
      default:
        return { 
          label: 'Unknown', 
          color: 'text-gray-700 bg-gray-50 border-gray-200',
          icon: <RefreshCw className="w-4 h-4 text-gray-500" />
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Avatar */}
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={doctorName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 font-semibold text-lg">
                  {doctorName?.charAt(0) || 'D'}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 truncate">
                  Dr. {doctorName}
                </h4>
                <span className="text-xs text-gray-400 truncate hidden sm:inline">
                  • {specialty}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(date).toLocaleDateString()}
                </span>
                <span className="font-semibold text-gray-900">
                  {currency} {amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
            
            {status === 'paid' && onViewReceipt && (
              <button
                onClick={onViewReceipt}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                title="View Receipt"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            
            {status === 'pending' && onPay && (
              <button
                onClick={onPay}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Pay Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}