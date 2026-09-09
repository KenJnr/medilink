'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Download, Printer, CheckCircle, Calendar, User, Stethoscope, CreditCard, Receipt as ReceiptIcon } from 'lucide-react'

interface ReceiptData {
  id: string
  amount: number
  currency: string
  status: string
  paid_at: string
  created_at: string
  provider: string
  provider_payment_id: string
  appointment: {
    id: string
    starts_at: string
    ends_at: string
    reason: string
    fee: number
    currency: string
    doctor: {
      full_name: string
      avatar_url: string | null
      specialty: string
    }
    patient: {
      full_name: string
      email: string
      phone: string
    }
  }
}

export default function ReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const receiptId = params.id as string

  useEffect(() => {
    if (user) {
      fetchReceipt()
    }
  }, [user, receiptId])

  const fetchReceipt = async () => {
    if (!user || !receiptId) return

    setLoading(true)
    setError('')

    try {
      // First, get the payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', receiptId)
        .eq('status', 'paid')
        .maybeSingle()

      if (paymentError) {
        console.error('Error fetching payment:', paymentError)
        throw paymentError
      }

      if (!payment) {
        setError('Receipt not found or payment not completed')
        setLoading(false)
        return
      }

      // Then get the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          starts_at,
          ends_at,
          reason,
          fee,
          currency,
          doctor_id,
          patient_id
        `)
        .eq('id', payment.appointment_id)
        .maybeSingle()

      if (appointmentError) {
        console.error('Error fetching appointment:', appointmentError)
        throw appointmentError
      }

      if (!appointment) {
        setError('Appointment not found')
        setLoading(false)
        return
      }

      // Get doctor details
      let doctorData = { full_name: 'Unknown Doctor', avatar_url: null, specialty: 'General Medicine' }
      if (appointment.doctor_id) {
        const { data: doctorUser, error: doctorError } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', appointment.doctor_id)
          .maybeSingle()

        if (!doctorError && doctorUser) {
          doctorData = {
            full_name: doctorUser.full_name || 'Unknown Doctor',
            avatar_url: doctorUser.avatar_url || null,
            specialty: 'General Medicine', // Default, will try to get from doctor_profiles
          }

          // Try to get specialty from doctor_profiles
          const { data: doctorProfile, error: profileError } = await supabase
            .from('doctor_profiles')
            .select('specialty')
            .eq('user_id', appointment.doctor_id)
            .maybeSingle()

          if (!profileError && doctorProfile?.specialty) {
            doctorData.specialty = doctorProfile.specialty
          }
        }
      }

      // Get patient details
      let patientData = { 
        full_name: user.full_name || 'Patient', 
        email: user.email || '', 
        phone: 'N/A' 
      }
      if (appointment.patient_id) {
        const { data: patientUser, error: patientError } = await supabase
          .from('users')
          .select('full_name, email, phone')
          .eq('id', appointment.patient_id)
          .maybeSingle()

        if (!patientError && patientUser) {
          patientData = {
            full_name: patientUser.full_name || 'Patient',
            email: patientUser.email || '',
            phone: patientUser.phone || 'N/A',
          }
        }
      }

      // Build the receipt data
      const receiptData: ReceiptData = {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency || 'GHS',
        status: payment.status,
        paid_at: payment.paid_at,
        created_at: payment.created_at,
        provider: payment.provider || 'paystack',
        provider_payment_id: payment.provider_payment_id || 'N/A',
        appointment: {
          id: appointment.id,
          starts_at: appointment.starts_at,
          ends_at: appointment.ends_at,
          reason: appointment.reason || 'General Consultation',
          fee: appointment.fee || payment.amount,
          currency: appointment.currency || 'GHS',
          doctor: {
            full_name: doctorData.full_name,
            avatar_url: doctorData.avatar_url,
            specialty: doctorData.specialty,
          },
          patient: {
            full_name: patientData.full_name,
            email: patientData.email,
            phone: patientData.phone,
          }
        }
      }

      setReceipt(receiptData)

    } catch (error) {
      console.error('Error fetching receipt:', error)
      setError('Failed to load receipt. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!receipt) return
    
    const content = `
MEDILINK RECEIPT
================
Receipt #: ${receipt.id.slice(0, 8)}
Date: ${new Date(receipt.paid_at || receipt.created_at).toLocaleString()}
Status: ${receipt.status.toUpperCase()}

PATIENT INFORMATION
-------------------
Name: ${receipt.appointment.patient.full_name}
Email: ${receipt.appointment.patient.email}
Phone: ${receipt.appointment.patient.phone}

DOCTOR INFORMATION
------------------
Name: Dr. ${receipt.appointment.doctor.full_name}
Specialty: ${receipt.appointment.doctor.specialty}

APPOINTMENT DETAILS
-------------------
Date: ${new Date(receipt.appointment.starts_at).toLocaleDateString()}
Time: ${new Date(receipt.appointment.starts_at).toLocaleTimeString()}
Reason: ${receipt.appointment.reason}

PAYMENT DETAILS
---------------
Amount: ${receipt.currency} ${receipt.amount.toFixed(2)}
Payment Method: ${receipt.provider.toUpperCase()}
Transaction ID: ${receipt.provider_payment_id}
Payment Date: ${new Date(receipt.paid_at || receipt.created_at).toLocaleString()}

Thank you for using MediLink!
    `
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${receipt.id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ReceiptIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Receipt Not Found</h2>
          <p className="text-gray-500 mt-2">{error || 'This receipt could not be found.'}</p>
          <Link
            href="/patient/payments"
            className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Payments
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link
            href="/patient/payments"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Payments
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none">
          {/* Receipt Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 sm:px-8 print:bg-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">MediLink</h1>
                <p className="text-blue-100 text-sm">Healthcare Made Simple</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span className="text-white font-medium">PAID</span>
                </div>
                <p className="text-blue-100 text-xs mt-1">
                  Receipt #{receipt.id.slice(0, 8)}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Patient Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient Information
                </h3>
                <p className="font-medium text-gray-900">{receipt.appointment.patient.full_name}</p>
                <p className="text-sm text-gray-600">{receipt.appointment.patient.email}</p>
                <p className="text-sm text-gray-600">{receipt.appointment.patient.phone}</p>
              </div>

              {/* Doctor Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Doctor Information
                </h3>
                <p className="font-medium text-gray-900">Dr. {receipt.appointment.doctor.full_name}</p>
                <p className="text-sm text-gray-600">{receipt.appointment.doctor.specialty}</p>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4" />
                Appointment Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(receipt.appointment.starts_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">
                    {new Date(receipt.appointment.starts_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="font-medium text-gray-900">{receipt.appointment.reason}</p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4" />
                Payment Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {receipt.currency} {receipt.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-700 capitalize">{receipt.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="font-medium text-gray-700 font-mono text-xs">
                    {receipt.provider_payment_id}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Date</span>
                  <span className="font-medium text-gray-700">
                    {new Date(receipt.paid_at || receipt.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {receipt.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 mt-8 pt-6 text-center text-sm text-gray-400">
              <p>Thank you for choosing MediLink. This is your official payment receipt.</p>
              <p className="mt-1">For any questions, please contact support@medilink.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}