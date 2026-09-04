// lib/types/payments.ts

export interface Payment {
  id: string
  appointment_id: string
  provider: string
  provider_payment_id: string | null
  checkout_session_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  paid_at: string | null
  refund_id: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
  appointment?: {
    id: string
    starts_at: string
    doctor_profiles?: {
      users?: {
        full_name: string
      }
      specialties?: {
        name: string
      }
    }
  }
}

export interface PaymentStats {
  total_paid: number
  total_pending: number
  total_refunded: number
  total_earnings: number
  recent_payments: Payment[]
}