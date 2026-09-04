// app/unauthorized/page.tsx
import Link from 'next/link'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Unauthorized Access</h2>
        <p className="text-gray-500 mb-8">
          You don't have permission to access this page.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}