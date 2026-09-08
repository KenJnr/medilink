// components/video/JitsiCall.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, PhoneOff } from 'lucide-react'

interface JitsiCallProps {
  roomName: string
  displayName: string
  onEnd?: () => void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

export default function JitsiCall({ roomName, displayName, onEnd }: JitsiCallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    // Skip if no room name
    if (!roomName) {
      setError('No room specified')
      setLoading(false)
      return
    }

    // Load Jitsi script
    const loadJitsiScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="external_api.js"]')
      if (existingScript) {
        console.log('Jitsi script already loaded')
        setScriptLoaded(true)
        initJitsi()
        return
      }

      console.log('Loading Jitsi script...')
      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.async = true
      
      script.onload = () => {
        console.log('Jitsi script loaded successfully')
        setScriptLoaded(true)
        initJitsi()
      }
      
      script.onerror = () => {
        console.error('Failed to load Jitsi script')
        setError('Failed to load Jitsi. Please refresh and try again.')
        setLoading(false)
      }
      
      document.body.appendChild(script)
    }

    const initJitsi = () => {
      if (!containerRef.current) {
        console.error('Container ref not available')
        setError('Container not available')
        setLoading(false)
        return
      }

      if (!window.JitsiMeetExternalAPI) {
        console.error('JitsiMeetExternalAPI not available')
        setError('Jitsi not loaded properly')
        setLoading(false)
        return
      }

      try {
        console.log('Initializing Jitsi with room:', roomName)
        
        const options = {
          roomName: roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            disableInviteFunctions: true,
            disableModeratorIndicator: true,
            disableActiveSpeaker: true,
            hideParticipantsStats: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videoswitchbutton', 'toolbar', 'captions', 'mute-everyone',
              'security'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            HIDE_INVITE_MORE_HEADER: true,
          },
          userInfo: {
            displayName: displayName || 'User'
          }
        }

        apiRef.current = new window.JitsiMeetExternalAPI(
          'meet.jit.si',
          options
        )

        // Listen for when the call ends
        apiRef.current.addListener('videoConferenceLeft', () => {
          console.log('Call ended by participant')
          handleEndCall()
        })

        apiRef.current.addListener('readyToClose', () => {
          console.log('Ready to close')
          handleEndCall()
        })

        apiRef.current.addListener('participantJoined', (participant: any) => {
          console.log('Participant joined:', participant.displayName)
        })

        setLoading(false)
        console.log('Jitsi initialized successfully')

      } catch (err) {
        console.error('Error initializing Jitsi:', err)
        setError('Failed to start video call: ' + (err instanceof Error ? err.message : 'Unknown error'))
        setLoading(false)
      }
    }

    // Load the script with a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      loadJitsiScript()
    }, 100)

    // Cleanup on unmount
    return () => {
      clearTimeout(timer)
      if (apiRef.current) {
        try {
          apiRef.current.dispose()
        } catch (e) {
          console.log('Error disposing Jitsi:', e)
        }
      }
    }
  }, [roomName, displayName])

  const handleEndCall = () => {
    if (apiRef.current) {
      try {
        apiRef.current.dispose()
      } catch (e) {
        console.log('Error disposing Jitsi:', e)
      }
    }
    if (onEnd) {
      onEnd()
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <p className="text-lg font-medium text-red-400">{error}</p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-white"
            >
              Retry
            </button>
            <button
              onClick={handleEndCall}
              className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Video Container */}
      <div className="flex-1 relative">
        <div 
          ref={containerRef} 
          className="w-full h-full bg-gray-800"
        />

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="mt-4 text-sm">Connecting to video call...</p>
          </div>
        )}
      </div>
    </div>
  )
}