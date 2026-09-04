// components/patient/QuickActions.tsx
import Link from 'next/link'
import { Search, CalendarPlus, User, CreditCard, FileText, CalendarCheck } from 'lucide-react'

const ACTIONS = [
  { label: 'Find doctor', href: '/doctors', icon: Search },
  { label: 'Appointments', href: '/patient/appointments', icon: CalendarCheck },
  { label: 'Book visit', href: '/patient/book', icon: CalendarPlus },
  { label: 'Records', href: '/patient/records', icon: FileText },
  { label: 'Payments', href: '/patient/payments', icon: CreditCard },
  { label: 'Profile', href: '/patient/profile', icon: User },
]

export default function QuickActions() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-medium text-gray-900 mb-4">Quick actions</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 text-center p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Icon size={18} className="text-gray-500" />
              <span className="text-xs text-gray-700">{action.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}