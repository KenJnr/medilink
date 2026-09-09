// components/doctor/DocumentUpload.tsx
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface DocumentUploadProps {
  doctorId: string
  userId: string
  onUploadComplete?: () => void
}

export default function DocumentUpload({ doctorId, userId, onUploadComplete }: DocumentUploadProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [documents, setDocuments] = useState({
    license: null as File | null,
    id_document: null as File | null,
    qualification: null as File | null,
  })
  const [documentUrls, setDocumentUrls] = useState({
    license: '',
    id_document: '',
    qualification: '',
  })
  
  const fileInputRefs = {
    license: useRef<HTMLInputElement>(null),
    id_document: useRef<HTMLInputElement>(null),
    qualification: useRef<HTMLInputElement>(null),
  }

  const supabase = createClient()

  const handleFileSelect = (type: keyof typeof documents, file: File | null) => {
    if (!file) return
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (JPEG, PNG)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setDocuments({ ...documents, [type]: file })
    setError('')
  }

  const removeFile = (type: keyof typeof documents) => {
    setDocuments({ ...documents, [type]: null })
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current.value = ''
    }
  }

  const uploadDocuments = async () => {
    if (!doctorId || !userId) {
      setError('Doctor information not found')
      return
    }

    // Check if any documents are selected
    const hasDocuments = Object.values(documents).some(doc => doc !== null)
    if (!hasDocuments) {
      setError('Please select at least one document to upload')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const uploadedUrls: Record<string, string> = {}

      // Upload each document
      for (const [type, file] of Object.entries(documents)) {
        if (!file) continue

        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`
        const filePath = `doctor-documents/${userId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath)

        uploadedUrls[type] = publicUrl
      }

      // Update doctor profile with document URLs
      const updateData: any = {
        documents_uploaded: true,
        document_status: 'pending',
      }

      if (uploadedUrls.license) updateData.license_document = uploadedUrls.license
      if (uploadedUrls.id_document) updateData.id_document = uploadedUrls.id_document
      if (uploadedUrls.qualification) updateData.qualification_document = uploadedUrls.qualification

      const { error: updateError } = await supabase
        .from('doctor_profiles')
        .update(updateData)
        .eq('id', doctorId)

      if (updateError) throw updateError

      setDocumentUrls(uploadedUrls as any)
      setSuccess('Documents uploaded successfully! Waiting for admin approval.')
      
      if (onUploadComplete) {
        setTimeout(onUploadComplete, 2000)
      }

    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message || 'Failed to upload documents')
    } finally {
      setUploading(false)
    }
  }

  const DocumentField = ({ type, label, accept = '.pdf,.jpg,.jpeg,.png' }: { type: keyof typeof documents, label: string, accept?: string }) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500">PDF or image (max 5MB)</p>
        </div>
        <div className="flex items-center gap-2">
          {documents[type] ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {documents[type]?.name}
              </span>
              <button
                onClick={() => removeFile(type)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRefs[type].current?.click()}
              className="px-3 py-1.5 text-xs text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
          )}
          <input
            ref={fileInputRefs[type]}
            type="file"
            accept={accept}
            onChange={(e) => handleFileSelect(type, e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
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
      </div> */}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <DocumentField type="license" label="Medical License" />
      <DocumentField type="id_document" label="Government ID / Passport" />
      <DocumentField type="qualification" label="Medical Qualification Certificate" />

      <button
        onClick={uploadDocuments}
        disabled={uploading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Submit Documents for Verification
          </>
        )}
      </button>
    </div>
  )
}