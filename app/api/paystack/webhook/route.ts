import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json(
        { message: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)

    // Handle different events
    if (event.event === 'charge.success') {
      const transaction = event.data
      const appointmentId = transaction.metadata?.appointment_id

      if (appointmentId) {
        const supabase = createClient()
        const { error } = await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            payment_reference: transaction.reference,
            payment_status: 'paid',
          })
          .eq('id', appointmentId)

        if (error) {
          console.error('Webhook: Failed to update appointment:', error)
          return NextResponse.json(
            { message: 'Failed to update appointment' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ message: 'Webhook received' }, { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { message: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}