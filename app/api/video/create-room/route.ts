// app/api/video/create-room/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { appointmentId, role } = body

    if (!appointmentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment ID is required',
        },
        { status: 400 }
      )
    }

    // Generate a unique room name using the appointment ID
    // Jitsi rooms are created on the fly when someone joins
    const roomName = `medilink-${appointmentId}`
    const roomUrl = `https://meet.jit.si/${roomName}`

    console.log('Creating Jitsi room:', roomName)
    console.log('Room URL:', roomUrl)

    // Jitsi doesn't need an API key - rooms are created when users join
    return NextResponse.json({
      success: true,
      roomName,
      roomUrl,
    })

  } catch (error) {
    console.error('Create room error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create video room',
      },
      { status: 500 }
    )
  }
}