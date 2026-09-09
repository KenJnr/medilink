import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { message: 'Reference is required' },
        { status: 400 }
      )
    }

    // Verify transaction with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!data.status) {
      return NextResponse.json(
        { message: data.message || 'Verification failed' },
        { status: 400 }
      )
    }

    const transaction = data.data

    if (transaction.status === 'success') {
      // Update appointment status in Supabase
      const supabase = createClient()
      const appointmentId = transaction.metadata?.appointment_id

      if (appointmentId) {
        const { error } = await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            payment_reference: reference,
            payment_status: 'paid',
          })
          .eq('id', appointmentId)

        if (error) {
          console.error('Failed to update appointment:', error)
        }
      }

      return NextResponse.json({
        status: 'success',
        message: 'Payment verified successfully',
        transaction: transaction,
      })
    }

    return NextResponse.json({
      status: 'failed',
      message: `Payment status: ${transaction.status}`,
    })

  } catch (error: any) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { message: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}