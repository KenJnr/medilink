// lib/types/patient-dashboard.ts

export interface User {
  id: string
  full_name: string
  email: string
  phone: string
  bio: string | null
  avatar_url?: string | null
}

export interface Appointment {
  id: string
  starts_at: string
  ends_at?: string
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled'
  consultation_type?: string
   fee?: number
  currency?: string
  doctor_profiles: {
    id?: string
    users: {
      full_name: string
      avatar_url?: string | null
    }
    specialties: {
      name: string
    }
    consultation_fee: number
  }
}

export interface Doctor {
  id: string
  full_name: string
  specialty_name: string
  consultation_fee: number
  currency: string
  location: string
}

export interface DashboardStats {
  confirmed: number
  pending: number
  completed: number
  total: number
  cancelled: number
}