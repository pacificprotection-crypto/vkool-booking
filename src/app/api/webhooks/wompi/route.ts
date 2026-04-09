import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createCalendarEvent } from '@/lib/calendar'
import { sendCustomerConfirmation, sendCompanyNotification } from '@/lib/emails'
import { LOCATIONS } from '@/lib/types'
import type { Booking } from '@/lib/types'

/**
 * Wompi calls this URL when a transaction status changes.
 * We verify the event signature, then on APPROVED we:
 *  1. Update booking status in Supabase
 *  2. Create event in Google Calendar
 *  3. Send customer confirmation email
 *  4. Send company notification email
 *  5. Increment coupon usage count (if applicable)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verify this is a real Wompi event
    const signature = req.headers.get('x-event-checksum')
    if (!verifyWompiSignature(body, signature)) {
      console.warn('Wompi signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { event, data } = body
    if (event !== 'transaction.updated') {
      return NextResponse.json({ received: true }) // ignore other event types
    }

    const transaction = data?.transaction
    if (!transaction) {
      return NextResponse.json({ error: 'No transaction data' }, { status: 400 })
    }

    const { reference, status, id: transactionId } = transaction

    const supabase = createServerClient()

    // Find the booking by its booking_code (= Wompi reference)
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_code', reference)
      .single()

    if (fetchError || !booking) {
      console.error('Booking not found for reference:', reference)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Only process if this is a new approval (idempotency guard)
    if (booking.status === 'paid') {
      return NextResponse.json({ received: true, note: 'Already processed' })
    }

    if (status === 'APPROVED') {
      // 1. Mark booking as paid in Supabase
      await supabase
        .from('bookings')
        .update({ status: 'paid', wompi_transaction_id: transactionId })
        .eq('id', booking.id)

      // Map DB row to Booking type
      const confirmedBooking: Booking = {
        id: booking.id,
        bookingCode: booking.booking_code,
        status: 'paid',
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        make: booking.make,
        model: booking.model,
        year: booking.year,
        vehicleType: booking.vehicle_type,
        tintType: booking.tint_type,
        date: booking.date,
        hour: booking.hour,
        locationId: booking.location_id,
        regularPrice: booking.regular_price,
        webPrice: booking.web_price,
        finalPrice: booking.final_price,
        couponCode: booking.coupon_code,
        couponDiscount: booking.coupon_discount,
        wompiTransactionId: transactionId,
        createdAt: booking.created_at,
      }

      // 2. Create Google Calendar event
      const location = LOCATIONS.find(l => l.id === booking.location_id)
      if (location?.calendarId) {
        await createCalendarEvent({
          calendarId: location.calendarId,
          date: booking.date,
          hour: booking.hour,
          customerName: booking.name,
          vehicleInfo: `${booking.make} ${booking.model} ${booking.year}`,
          tintType: booking.tint_type,
          bookingCode: booking.booking_code,
          phone: booking.phone,
        })
      }

      // 3 & 4. Send emails (in parallel)
      await Promise.allSettled([
        sendCustomerConfirmation(confirmedBooking),
        sendCompanyNotification(confirmedBooking),
      ])

      // 5. Increment coupon usage if applicable
      if (booking.coupon_code) {
        await supabase.rpc('increment_coupon_usage', { coupon_code: booking.coupon_code })
      }

    } else if (status === 'DECLINED' || status === 'VOIDED') {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', wompi_transaction_id: transactionId })
        .eq('id', booking.id)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Wompi webhook error:', err)
    // Always return 200 to Wompi — otherwise it will retry indefinitely
    return NextResponse.json({ received: true, error: 'Internal error' })
  }
}

/**
 * Verifies the Wompi event signature.
 * See: https://docs.wompi.co/docs/en/events
 */
function verifyWompiSignature(body: Record<string, unknown>, signature: string | null): boolean {
  if (!signature) return false
  try {
    const crypto = require('crypto')
    const secret = process.env.WOMPI_EVENTS_SECRET!
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(body) + secret)
      .digest('hex')
    return checksum === signature
  } catch {
    return false
  }
}
