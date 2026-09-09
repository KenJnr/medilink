'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminSetup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const createAdmin = async () => {
    if (!email || !password) {
      setMessage('❌ Please fill in all fields')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Step 1: Check if user exists in users table by email
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle()

      if (existingUser) {
        // ✅ User exists - update role to admin
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('email', email)

        if (updateError) throw updateError
        
        setMessage(`✅ User ${email} has been upgraded to Admin!`)
        
        // ✅ Redirect to admin dashboard after short delay
        setTimeout(() => {
          router.push('/login')
        }, 1500)
        
        setLoading(false)
        return
      }

      // Step 2: Check if user exists by ID (for duplicate ID scenario)
      const { data: existingById, error: idCheckError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', '58a9d144-f285-404b-a4fe-88c198ab1566')
        .maybeSingle()

      if (existingById) {
        // ✅ Update by ID instead
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            role: 'admin',
            email: email,
            full_name: 'Admin'
          })
          .eq('id', '58a9d144-f285-404b-a4fe-88c198ab1566')

        if (updateError) throw updateError
        
        setMessage(`✅ Existing user upgraded to Admin!`)
        
        // ✅ Redirect to admin dashboard after short delay
        setTimeout(() => {
          router.push('/login')
        }, 1500)
        
        setLoading(false)
        return
      }

      // Step 3: User doesn't exist - create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          // Auth user exists but not in users table
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user && user.email === email) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: email,
                full_name: 'Admin',
                role: 'admin',
              })

            if (insertError) {
              if (insertError.code === '23505') {
                const { error: updateRetryError } = await supabase
                  .from('users')
                  .update({ role: 'admin' })
                  .eq('id', user.id)
                
                if (updateRetryError) throw updateRetryError
                setMessage('✅ User upgraded to Admin!')
                
                // ✅ Redirect to admin dashboard
                setTimeout(() => {
                  router.push('/login')
                }, 1500)
                
                setLoading(false)
                return
              }
              throw insertError
            }
            setMessage('✅ Admin created successfully!')
            
            // ✅ Redirect to admin dashboard
            setTimeout(() => {
              router.push('/login')
            }, 1500)
            
            setLoading(false)
            return
          }
        }
        throw authError
      }

      if (!authData.user) throw new Error('Failed to create user')

      // Step 4: Insert new user with admin role
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: 'Admin',
          role: 'admin',
        })

      if (insertError) {
        if (insertError.code === '23505') {
          const { error: updateRetryError } = await supabase
            .from('users')
            .update({ 
              role: 'admin',
              email: email,
              full_name: 'Admin'
            })
            .eq('id', authData.user.id)
          
          if (updateRetryError) throw updateRetryError
          setMessage('✅ User upgraded to Admin!')
          
          // ✅ Redirect to admin dashboard
          setTimeout(() => {
            router.push('/login')
          }, 1500)
          
          setLoading(false)
          return
        }
        throw insertError
      }

      setMessage('✅ Admin created successfully! You can now login.')
      
      // ✅ Redirect to admin dashboard after short delay
      setTimeout(() => {
        router.push('/(login')
      }, 1500)

    } catch (error: any) {
      console.error('Admin creation error:', error)
      setMessage(`❌ Error: ${error.message || 'Something went wrong'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Admin Setup</h1>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg placeholder-gray-400 text-gray-900"
          />
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg placeholder-gray-400 text-gray-900"
          />
          <button
            onClick={createAdmin}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Admin Account'}
          </button>
          {message && (
            <p className={`text-center ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-gray-400 text-center">
          ⚠️ Remove this page after creating the admin account
        </p>
      </div>
    </div>
  )
}