// app/doctor/profile/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DeleteAccountButton from '@/components/DeleteAccountButton'

interface Specialty {
  id: string
  name: string
}

interface DoctorProfile {
  id: string
  user_id: string
  specialty_id: string
  bio: string
  qualifications: string[]
  experience_years: number
  consultation_fee: number
  currency: string
  location: string
  consultation_type: string
  profile_image: string
  approval_status: string
  documents_uploaded: boolean
  document_status: string
  license_document: string | null
  id_document: string | null
  qualification_document: string | null
}

export default function DoctorProfilePage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null)

  const [profile, setProfile] = useState({
    id: '',
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    avatar_url: '',
    specialty_id: '',
    qualifications: [''],
    experience_years: 0,
    consultation_fee: 0,
    currency: 'GHS',
    location: '',
    consultation_type: 'in_person',
  })

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  const [showPasswordSection, setShowPasswordSection] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchProfile()
      fetchSpecialties()
    }
  }, [user, authLoading])

  const fetchSpecialties = async () => {
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .eq('active', true)
    if (data) setSpecialties(data)
  }

  const fetchProfile = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      // Fetch doctor profile
      const { data: profileData, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      if (profileData) {
        setDoctorProfile(profileData as DoctorProfile)
      }

      setProfile({
        id: profileData?.id || '',
        full_name: userData?.full_name || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
        bio: profileData?.bio || '',
        avatar_url: userData?.avatar_url || '',
        specialty_id: profileData?.specialty_id || '',
        qualifications: profileData?.qualifications || [''],
        experience_years: profileData?.experience_years || 0,
        consultation_fee: profileData?.consultation_fee || 0,
        currency: profileData?.currency || 'GHS',
        location: profileData?.location || '',
        consultation_type: profileData?.consultation_type || 'in_person',
      })
    } catch (error) {
      console.error('Fetch error:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    setUploadingImage(true)
    setError('')

    try {
      if (!user) throw new Error('User not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('profiles').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setSuccess('Profile image updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (!user) throw new Error('User not authenticated')

      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq('id', user.id)

      if (userError) throw userError

      // Update doctor profile
      const doctorData = {
        specialty_id: profile.specialty_id,
        bio: profile.bio,
        qualifications: profile.qualifications,
        experience_years: profile.experience_years,
        consultation_fee: profile.consultation_fee,
        currency: profile.currency,
        location: profile.location,
        consultation_type: profile.consultation_type,
      }

      if (profile.id) {
        const { error: updateError } = await supabase
          .from('doctor_profiles')
          .update(doctorData)
          .eq('id', profile.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('doctor_profiles')
          .insert({
            ...doctorData,
            user_id: user.id,
            approval_status: 'pending',
          })

        if (insertError) throw insertError
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)

      // Refresh profile data
      await fetchProfile()
    } catch (error: any) {
      console.error('Save error:', error)
      setError(error.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      setSaving(false)
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) throw error

      setPasswordData({
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordSection(false)
      setSuccess('Password updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Password change error:', error)
      setError(error.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const addQualification = () => {
    setProfile({ ...profile, qualifications: [...profile.qualifications, ''] })
  }

  const removeQualification = (index: number) => {
    const newQualifications = profile.qualifications.filter(
      (_, i) => i !== index,
    )
    setProfile({ ...profile, qualifications: newQualifications })
  }

  const updateQualification = (index: number, value: string) => {
    const newQualifications = [...profile.qualifications]
    newQualifications[index] = value
    setProfile({ ...profile, qualifications: newQualifications })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/doctor" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">
                Doctor Profile
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/doctor"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">
              Doctor Profile
            </h1>
            <p className="text-sm text-gray-500">
              Manage your professional information
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 pb-6 border-b border-gray-200">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-3xl text-blue-600 overflow-hidden">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile.full_name?.charAt(0).toUpperCase() || 'D'
                    )}
                  </div>
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-medium text-gray-900">Profile Photo</h3>
                  <p className="text-sm text-gray-500">
                    Upload a photo to personalize your profile
                  </p>
                  <div className="mt-2 flex gap-3 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Upload Photo
                    </button>
                    {profile.avatar_url && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!user) return
                          await supabase
                            .from('users')
                            .update({ avatar_url: null })
                            .eq('id', user.id)
                          setProfile({ ...profile, avatar_url: '' })
                          setSuccess('Profile image removed')
                          setTimeout(() => setSuccess(''), 3000)
                        }}
                        className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Profile Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile({ ...profile, full_name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty
                  </label>
                  <select
                    value={profile.specialty_id}
                    onChange={(e) =>
                      setProfile({ ...profile, specialty_id: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900"
                  >
                    <option value="">Select a specialty</option>
                    {specialties.map((specialty) => (
                      <option key={specialty.id} value={specialty.id}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none placeholder:text-gray-400 text-gray-900"
                    placeholder="Tell patients about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualifications
                  </label>
                  {profile.qualifications.map((qual, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={qual}
                        onChange={(e) =>
                          updateQualification(index, e.target.value)
                        }
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                        placeholder="e.g., MBChB, MD, PhD"
                      />
                      {profile.qualifications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQualification(index)}
                          className="px-3 text-red-600 hover:text-red-800 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addQualification}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    + Add qualification
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={profile.experience_years}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          experience_years: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consultation Fee
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={profile.consultation_fee}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            consultation_fee: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                        min="0"
                        step="0.01"
                      />
                      <select
                        value={profile.currency}
                        onChange={(e) =>
                          setProfile({ ...profile, currency: e.target.value })
                        }
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900"
                      >
                        <option value="GHS">GHS</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="NGN">NGN</option>
                        <option value="KES">KES</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                    placeholder="e.g., Accra, Ghana"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consultation Type
                  </label>
                  <select
                    value={profile.consultation_type}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        consultation_type: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900"
                  >
                    <option value="in_person">In-Person</option>
                    <option value="virtual">Virtual</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>

            {/* Password Change Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                <span>{showPasswordSection ? '▼' : '▶'}</span>
                Change Password
              </button>

              {showPasswordSection && (
                <form
                  onSubmit={handlePasswordChange}
                  className="mt-4 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                      placeholder="Enter new password (min 6 characters)"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400 text-gray-900"
                      placeholder="Confirm your new password"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordSection(false)
                        setPasswordData({
                          newPassword: '',
                          confirmPassword: '',
                        })
                      }}
                      className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Document Verification Status */}
            {doctorProfile && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Document Verification</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">Verification Status</p>
                      <p className="text-sm font-medium mt-1">
                        {doctorProfile.approval_status === 'active' ? (
                          <span className="text-green-600">✅ Verified</span>
                        ) : doctorProfile.documents_uploaded ? (
                          <span className="text-yellow-600">⏳ Pending Review</span>
                        ) : (
                          <span className="text-red-600">❌ Documents Required</span>
                        )}
                      </p>
                    </div>
                    {!doctorProfile.documents_uploaded && doctorProfile.approval_status !== 'active' && (
                      <Link
                        href="/doctor/documents"
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upload Documents
                      </Link>
                    )}
                  </div>
                  
                  {/* Show uploaded documents */}
                  {doctorProfile.documents_uploaded && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Documents uploaded:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {doctorProfile.license_document && (
                          <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                            📄 Medical License
                          </span>
                        )}
                        {doctorProfile.id_document && (
                          <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                            📄 Government ID
                          </span>
                        )}
                        {doctorProfile.qualification_document && (
                          <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                            📄 Qualification Certificate
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delete Account */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <DeleteAccountButton
                userId={user?.id || ''}
                userEmail={user?.email || ''}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}