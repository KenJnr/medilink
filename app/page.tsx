// app/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CountUp from "@/components/CountUp"
import Link from "next/link"
import { useAuth } from '@/components/AuthProvider'

export default function Home() {
  const [showDropdown, setShowDropdown] = useState(false)
  const { user, userRole, loading, signOut } = useAuth()

  const handleLogout = async () => {
    setShowDropdown(false)
   await signOut()
  }

  const getDashboardPath = () => {
    switch (userRole) {
      case 'admin':
        return '/admin'
      case 'doctor':
        return '/doctor'
      case 'patient':
        return '/patient'
      default:
        return '/'
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-sm border-b fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                MediLink
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : user ? (
                // Logged in - Show profile avatar with dropdown
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm hover:bg-blue-200 transition-colors">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-gray-700 hidden sm:block">
                      {user.email?.split('@')[0] || 'User'}
                    </span>
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">
                          {userRole || 'User'}
                        </p>
                      </div>
                      <Link
                        href={getDashboardPath()}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        
                        Go to Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Not logged in - Show sign in and get started buttons
                <>
                  <Link href="/login" className="text-gray-700 hover:text-gray-900">
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Background Image */}
      <section className="relative min-h-screen flex items-center mb-10 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/doctor.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/50 to-black/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold text-white md:text-6xl lg:text-6xl">
              Find the right doctor
              <br />
              <span className="text-blue-400">for your healthcare needs</span>
            </h1>
            <p className="mt-5 text-xl text-gray-200 max-w-xl">
              Book appointments with trusted doctors. Easy, fast, and secure.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href={user ? getDashboardPath() : "/register"}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg"
              >
                {user ? 'Go to Dashboard' : 'Get started'}
              </Link>
              <Link
                href="/doctors"
                className="inline-flex items-center justify-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-white/10 transition-colors"
              >
                Find a Doctor
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Verified doctors
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Secure booking
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Easy payments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="bg-white py-16 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              Quality Healthcare Delivery
              <br />
              <span className="text-blue-600">Made Simple and Accessible</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              We're transforming how patients connect with healthcare providers across Ghana
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Features... keep existing features */}
            <div className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-80">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('/docs.jpg')` }}
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Find Doctors Near You</h3>
                <p className="text-sm sm:text-base text-gray-200 leading-relaxed opacity-90">
                  Search and connect with qualified doctors in your area.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-80">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('/booking.jpg')` }}
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Easy Online Booking</h3>
                <p className="text-sm sm:text-base text-gray-200 leading-relaxed opacity-90">
                  Book appointments instantly with real-time availability.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-80">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('/online.jpg')` }}
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Virtual Consultations</h3>
                <p className="text-sm sm:text-base text-gray-200 leading-relaxed opacity-90">
                  Access quality healthcare from the comfort of your home.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-80">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('/payment.jpg')` }}
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Secure & Transparent Payments</h3>
                <p className="text-sm sm:text-base text-gray-200 leading-relaxed opacity-90">
                  Pay securely online with transparent pricing.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-80">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('/quality.jpg')` }}
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Quality-Assured Healthcare</h3>
                <p className="text-sm sm:text-base text-gray-200 leading-relaxed opacity-90">
                  All doctors are verified and qualified.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-80">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('/records.jpg')` }}
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Medical Records Access</h3>
                <p className="text-sm sm:text-base text-gray-200 leading-relaxed opacity-90">
                  Keep track of your health journey.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-600 py-16 sm:py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">
                <CountUp end={500} duration={2.5} />
              </p>
              <p className="mt-2 text-sm sm:text-base text-blue-100">Trusted Doctors</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">
                <CountUp end={10000} duration={2.5} suffix="+" />
              </p>
              <p className="mt-2 text-sm sm:text-base text-blue-100">Happy Patients</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">
                <CountUp end={98} duration={2.5} suffix="%" />
              </p>
              <p className="mt-2 text-sm sm:text-base text-blue-100">Satisfaction Rate</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white">
                <CountUp end={24} duration={2.5} suffix="/7" />
              </p>
              <p className="mt-2 text-sm sm:text-base text-blue-100">Accessible Care</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href={user ? getDashboardPath() : "/register"}
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium rounded-lg text-blue-600 bg-white hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
            >
              {user ? 'Go to Dashboard' : 'Get Started Today'}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 rounded-t-[40px] sm:rounded-t-[60px] relative z-20 -mt-8 sm:-mt-14 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-1">
              <h3 className="text-2xl font-bold text-white mb-4">MediLink</h3>
              <p className="text-sm text-gray-400">Connecting patients with trusted healthcare providers.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/doctors" className="hover:text-white transition-colors">Find a Doctor</Link></li>
                <li><Link href="/specialties" className="hover:text-white transition-colors">Specialties</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Patients</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white transition-colors">Sign Up</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link href="/patient/appointments" className="hover:text-white transition-colors">My Appointments</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@medilink.com" className="hover:text-white transition-colors">support@medilink.com</a></li>
                <li><a href="tel:+233551234567" className="hover:text-white transition-colors">+233 55 123 4567</a></li>
                <li><span>Accra, Ghana</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} MediLink. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}