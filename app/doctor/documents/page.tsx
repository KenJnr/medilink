// app/doctor/documents/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowLeft, FileText, Upload, X, Loader2 } from 'lucide-react'
import DocumentUpload from '@/components/doctor/DocumentUpload'

export default function DoctorDocumentsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [doctorProfile, setDoctorProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && userRole === 'doctor') {
      fetchDoctorProfile()
    }
  }, [user, userRole, authLoading])

  const fetchDoctorProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setDoctorProfile(data)
    } catch (error) {
      console.error('Error fetching doctor profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // If doctor is already approved, show success state
  if (doctorProfile?.approval_status === 'active') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/doctor" className="text-xl font-bold text-blue-600">
                  MediLink
                </Link>
                <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Documents</span>
              </div>
              <Link href="/doctor" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                ← Back
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-900">Document Upload</h1>
              <p className="text-sm text-gray-500">Upload your verification documents</p>
            </div>

            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-green-800 font-medium">Your account is already verified!</p>
                <p className="text-sm text-green-600 mt-1">You don't need to upload any documents.</p>
                <Link
                  href="/doctor"
                  className="inline-block mt-4 px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // If documents are already uploaded and pending review
  if (doctorProfile?.documents_uploaded && doctorProfile?.document_status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/doctor" className="text-xl font-bold text-blue-600">
                  MediLink
                </Link>
                <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Documents</span>
              </div>
              <Link href="/doctor" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                ← Back
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-900">Document Upload</h1>
              <p className="text-sm text-gray-500">Upload your verification documents</p>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <p className="text-blue-800 font-medium">Documents Submitted</p>
                <p className="text-sm text-blue-600 mt-1">
                  Your documents have been submitted and are being reviewed by our admin team.
                </p>
                <p className="text-xs text-blue-500 mt-2">
                  This usually takes 24-48 hours. You will be notified once approved.
                </p>
                <Link
                  href="/doctor"
                  className="inline-block mt-4 px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>

              {/* Show uploaded documents */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Uploaded Documents</h3>
                <div className="space-y-2">
                  {doctorProfile.license_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-700">Medical License</span>
                      </div>
                      <span className="text-xs text-green-600">✅ Uploaded</span>
                    </div>
                  )}
                  {doctorProfile.id_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-700">Government ID / Passport</span>
                      </div>
                      <span className="text-xs text-green-600">✅ Uploaded</span>
                    </div>
                  )}
                  {doctorProfile.qualification_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-purple-500" />
                        <span className="text-sm text-gray-700">Qualification Certificate</span>
                      </div>
                      <span className="text-xs text-green-600">✅ Uploaded</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  You can check the status of your documents on your profile page.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Main document upload page
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/doctor" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Documents</span>
            </div>
            <Link href="/doctor" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Document Upload</h1>
            <p className="text-sm text-gray-500">Upload your verification documents</p>
          </div>

          <div className="p-6">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-yellow-600 text-xl">📋</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Documents Required for Verification
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please upload the following documents to verify your identity and qualifications.
                    Your account will be reviewed by an admin within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>

            <DocumentUpload
              doctorId={doctorProfile?.id || ''}
              userId={user?.id || ''}
              onUploadComplete={() => {
                router.push('/doctor')
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}