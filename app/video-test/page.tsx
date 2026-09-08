'use client'

import { useState } from 'react'
import Daily from '@daily-co/daily-js'

export default function VideoTestPage() {
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRoom = async () => {
    try {
      setLoading(true)
      setError(null)

      /*
       * Fake appointment ID for testing.
       *
       * Later this will be the real appointment ID.
       */
      const appointmentId = 'test-appointment-001'

      const response = await fetch('/api/video/create-room', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          appointmentId,
        }),
      })

      const data = await response.json()

      console.log('Room API response:', data)

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || 'Failed to create video room'
        )
      }

      setRoomUrl(data.roomUrl)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async () => {
    if (!roomUrl) return

    try {
      const callFrame = Daily.createFrame(
        undefined,
        {
          showLeaveButton: true,
          showFullscreenButton: true,
          showLocalVideo: true,

          iframeStyle: {
            width: '100%',
            height: '600px',
            border: '0',
            borderRadius: '12px',
          },
        }
      )

      await callFrame.join({
        url: roomUrl,
      })
    } catch (err) {
      console.error('Failed to join Daily room:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to join video room'
      )
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">

        <h1 className="mb-2 text-3xl font-bold">
          MediLink Video Test
        </h1>

        <p className="mb-8 text-gray-600">
          Testing Daily.co video rooms.
        </p>

        {!roomUrl && (
          <button
            onClick={createRoom}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Room...' : 'Create Video Room'}
          </button>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {roomUrl && (
          <div className="mt-8">

            <div className="mb-6 rounded-lg border bg-white p-5 shadow-sm">

              <p className="mb-2 text-sm font-medium text-gray-500">
                Room URL
              </p>

              <p className="break-all text-sm text-gray-700">
                {roomUrl}
              </p>

              <button
                onClick={joinRoom}
                className="mt-4 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
              >
                Join Video Call
              </button>

            </div>

          </div>
        )}

      </div>
    </main>
  )
}