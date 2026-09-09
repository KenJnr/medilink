import { NextResponse } from 'next/server'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Received payload:', body)  // ✅ Add this for debugging

    const { email, amount, appointmentId, doctorId, patientId } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: 'Valid amount is required' },
        { status: 400 }
      )
    }

    if (!appointmentId) {
      return NextResponse.json(
        { message: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Amount in kobo (smallest currency unit)
    const amountInKobo = amount * 100

    // Initialize transaction with Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        amount: amountInKobo,
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/callback`,
        metadata: {
          appointment_id: appointmentId,
          doctor_id: doctorId || '',
          patient_id: patientId || '',
        },
      }),
    })

    const data = await response.json()
    console.log('Paystack response:', data)  // ✅ Add this for debugging

    if (!data.status) {
      console.error('Paystack error:', data.message)
      return NextResponse.json(
        { message: data.message || 'Payment initialization failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    })

  } catch (error: any) {
    console.error('Payment init error:', error)
    return NextResponse.json(
      { message: error.message || 'Payment initialization failed' },
      { status: 500 }
    )
  }
}