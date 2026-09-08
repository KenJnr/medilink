// app/admin/users/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, User, Stethoscope, Shield, MoreVertical, UserMinus, UserPlus, Eye } from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'patient' | 'doctor' | 'admin'
  status: 'active' | 'suspended' | 'pending'
  created_at: string
}

interface Action {
  label: string
  value: string
  icon: any
  color: string
}

export default function AdminUsersPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
      fetchUsers()
    }
  }, [user, userRole, authLoading, filterRole, filterStatus])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUsers = async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterRole !== 'all') {
        query = query.eq('role', filterRole)
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'activate' | 'suspend') => {
    setProcessing(userId)
    setOpenDropdown(null)

    try {
      const newStatus = action === 'activate' ? 'active' : 'suspended'
      
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId)

      if (error) throw error

      // If user is a doctor, also update their approval_status in doctor_profiles
      const user = users.find(u => u.id === userId)
      if (user?.role === 'doctor') {
        const doctorProfileStatus = action === 'activate' ? 'active' : 'suspended'
        await supabase
          .from('doctor_profiles')
          .update({ approval_status: doctorProfileStatus })
          .eq('user_id', userId)
      }

      await fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user status')
    } finally {
      setProcessing(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return Shield
      case 'doctor':
        return Stethoscope
      default:
        return User
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border border-green-200',
      suspended: 'bg-red-100 text-red-700 border border-red-200',
      pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    }
    const labels: Record<string, string> = {
      active: 'Active',
      suspended: 'Suspended',
      pending: 'Pending',
    }
    return {
      className: styles[status] || 'bg-gray-100 text-gray-700 border border-gray-200',
      label: labels[status] || status,
    }
  }

  const getFilteredUsers = () => {
    let filtered = users
    
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }

  const filteredUsers = getFilteredUsers()

  const getAvailableActions = (user: User): Action[] => {
    const actions: Action[] = []
    
    // Don't allow suspending/activating admin accounts
    if (user.role === 'admin') {
      return actions
    }
    
    if (user.status === 'active') {
      actions.push({ 
        label: 'Suspend', 
        value: 'suspend', 
        icon: UserMinus, 
        color: 'text-orange-600 hover:bg-orange-50' 
      })
    } else if (user.status === 'suspended') {
      actions.push({ 
        label: 'Activate', 
        value: 'activate', 
        icon: UserPlus, 
        color: 'text-green-600 hover:bg-green-50' 
      })
    } else if (user.status === 'pending') {
      actions.push({ 
        label: 'Activate', 
        value: 'activate', 
        icon: UserPlus, 
        color: 'text-green-600 hover:bg-green-50' 
      })
      actions.push({ 
        label: 'Suspend', 
        value: 'suspend', 
        icon: UserMinus, 
        color: 'text-orange-600 hover:bg-orange-50' 
      })
    }
    
    return actions
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading users...</p>
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
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Manage Users</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage all users on the platform</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-48 placeholder-gray-400 text-gray-700"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-700"
            >
              <option value="all">All Roles</option>
              <option value="patient">Patients</option>
              <option value="doctor">Doctors</option>
              <option value="admin">Admins</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((u) => {
              const status = getStatusBadge(u.status)
              const RoleIcon = getRoleIcon(u.role)
              const actions: Action[] = getAvailableActions(u)
              const isDropdownOpen = openDropdown === u.id
              const isAdmin = u.role === 'admin'

              return (
                <div
                  key={u.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm shrink-0">
                        {u.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {u.full_name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200`}>
                        <RoleIcon className="w-3 h-3" />
                        {u.role}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>

                      {/* Vertical 3-dot dropdown - only for non-admin users */}
                      {!isAdmin && actions.length > 0 && (
                        <div className="relative" ref={dropdownRef}>
                          <button
                            onClick={() => setOpenDropdown(isDropdownOpen ? null : u.id)}
                            disabled={processing === u.id}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              {actions.map((action) => (
                                <button
                                  key={action.value}
                                  onClick={() => handleUserAction(u.id, action.value as 'activate' | 'suspend')}
                                  disabled={processing === u.id}
                                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors ${action.color}`}
                                >
                                  <action.icon className="w-4 h-4" />
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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