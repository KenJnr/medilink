'use client'

import dynamic from 'next/dynamic'

// Dynamically import the component with SSR disabled
const PaymentCallbackContent = dynamic(
  () => import('./PaymentCallbackContent'),
  { ssr: false }
)

export default function PaymentCallbackPage() {
  return <PaymentCallbackContent />
}