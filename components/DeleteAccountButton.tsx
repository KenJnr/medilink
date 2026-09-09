// components/DeleteAccountButton.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'

interface DeleteAccountButtonProps {
  userId: string
  userEmail?: string
  onDelete?: () => void
}

export default function DeleteAccountButton({ userId, userEmail, onDelete }: DeleteAccountButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleDelete = async () => {
    if (!userId) {
      setError('User ID not found')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Starting account deletion for user:', userId)

      // Step 1: Get all appointments for this user
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError)
      }

      // Step 2: Delete payments associated with appointments
      if (appointments && appointments.length > 0) {
        const appointmentIds = appointments.map((a: any) => a.id)
        const { error: paymentsError } = await supabase
          .from('payments')
          .delete()
          .in('appointment_id', appointmentIds)

        if (paymentsError) {
          console.error('Error deleting payments:', paymentsError)
        }
      }

      // Step 3: Delete appointments
      const { error: deleteAppointmentsError } = await supabase
        .from('appointments')
        .delete()
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)

      if (deleteAppointmentsError) {
        console.error('Error deleting appointments:', deleteAppointmentsError)
      }

      // Step 4: If user is a doctor, delete doctor profile
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userData?.role === 'doctor') {
        const { error: doctorProfileError } = await supabase
          .from('doctor_profiles')
          .delete()
          .eq('user_id', userId)

        if (doctorProfileError) {
          console.error('Error deleting doctor profile:', doctorProfileError)
        }
      }

      // Step 5: Delete user from public.users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (userError) {
        console.error('Error deleting user:', userError)
        setError('Failed to delete user profile. Please contact support.')
        setLoading(false)
        return
      }

      // Step 6: Delete the auth user using the admin API
      console.log('Attempting to delete auth user...')
      
      // Call the API route to delete the auth user
      const response = await fetch('/api/auth/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error deleting auth user:', result.error)
        // Don't fail the whole process - the user is already deleted from public.users
        console.warn('Auth user deletion failed but public user was deleted. Please contact support.')
      } else {
        console.log('Auth user deleted successfully')
      }

      // Step 7: Sign out and redirect
      await supabase.auth.signOut()
      router.push('/')
      
      if (onDelete) onDelete()
      
    } catch (error) {
      console.error('Error deleting account:', error)
      setError('An unexpected error occurred. Please try again or contact support.')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      ) : (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Are you sure you want to delete your account?
              </p>
              <p className="text-xs text-red-600 mt-1">
                This action cannot be undone. All your data including appointments, 
                profile information, and history will be permanently deleted.
              </p>
              {userEmail && (
                <p className="text-xs text-red-600 mt-2">
                  Account: <span className="font-medium">{userEmail}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete My Account'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false)
                    setError('')
                  }}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}