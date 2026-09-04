// app/admin/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, Search, Calendar, User, DollarSign } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  paid_at: string | null
  created_at: string
  appointment_id: string
  patient_name: string
  doctor_name: string
}

export default function AdminPaymentsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && userRole !== 'admin') {
      router.push('/unauthorized')
      return
    }
    if (user && userRole === 'admin') {
      fetchPayments()
    }
  }, [user, userRole, authLoading, filter])

  const fetchPayments = async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          appointment:appointment_id (
            patient_user:patient_id (
              full_name
            ),
            doctor_user:doctor_id (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      const mapped: Payment[] = data?.map((p: any) => ({
        id: p.id,
        amount: p.amount || 0,
        currency: p.currency || 'GHS',
        status: p.status || 'pending',
        paid_at: p.paid_at || null,
        created_at: p.created_at,
        appointment_id: p.appointment_id,
        patient_name: p.appointment?.patient_user?.full_name || 'Unknown',
        doctor_name: p.appointment?.doctor_user?.full_name || 'Unknown',
      })) || []

      setPayments(mapped)
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      processing: 'bg-blue-100 text-blue-700 border border-blue-200',
      paid: 'bg-green-100 text-green-700 border border-green-200',
      failed: 'bg-red-100 text-red-700 border border-red-200',
      refunded: 'bg-gray-100 text-gray-700 border border-gray-200',
    }
    const labels: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing',
      paid: 'Paid ✅',
      failed: 'Failed ❌',
      refunded: 'Refunded',
    }
    return {
      className: styles[status] || 'bg-gray-100 text-gray-700 border border-gray-200',
      label: labels[status] || status,
    }
  }

  const getFilteredPayments = () => {
    if (!searchTerm) return payments
    return payments.filter(
      (p) =>
        p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredPayments = getFilteredPayments()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading payments...</p>
        </div>
      </div>
    )
  }

  if (!user || userRole !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Payments</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500 mt-1">Track all payments on the platform</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-64"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' },
            { value: 'failed', label: 'Failed' },
            { value: 'refunded', label: 'Refunded' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No payments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((p) => {
              const status = getStatusBadge(p.status)

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900">
                          {p.currency} {p.amount.toFixed(2)}
                        </span>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{p.patient_name}</span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span>{p.doctor_name}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(p.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                        {p.paid_at && (
                          <span className="text-xs text-green-600">
                            Paid: {new Date(p.paid_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}