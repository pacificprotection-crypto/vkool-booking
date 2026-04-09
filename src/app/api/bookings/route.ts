import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateBookingCode, dollarsToCents } from '@/lib/utils'
import type { BookingFormData } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body: BookingFormData = await req.json()

    // Basic validation
    const required: (keyof BookingFormData)[] = [
      'name', 'email', 'phone', 'make', 'model',
      'vehicleType', 'tintType', 'date', 'hour', 'finalPrice',
    ]
    for (const field of required) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Campo requerido: ${field}` }, { status: 400 })
      }
    }

    const supabase = createServerClient()
    const bookingCode = generateBookingCode(body.date)

    // Store pending booking in Supabase
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        booking_code: bookingCode,
        status: 'pending',
        name: body.name,
        email: body.email,
        phone: body.phone,
        make: body.make,
        model: body.model,
        year: body.year,
        vehicle_type: body.vehicleType,
        tint_type: body.tintType,
        date: body.date,
        hour: body.hour,
        location_id: body.locationId ?? 'san-salvador',
        regular_price: body.regularPrice,
        web_price: body.webPrice,
        final_price: body.finalPrice,
        coupon_code: body.couponCode ?? null,
        coupon_discount: body.couponDiscount ?? 0,
      })
      .select()
      .single()

    if (error || !booking) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 })
    }

    // Build Wompi payment link
    // Wompi requires amount in centavos (USD cents)
    const amountInCents = dollarsToCents(body.finalPrice)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const wompiParams = new URLSearchParams({
      'public-key': process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY!,
      currency: 'USD',
      'amount-in-cents': String(amountInCents),
      reference: bookingCode,
      'redirect-url': `${appUrl}/confirm?booking=${booking.id}`,
    })

    const wompiUrl = `${process.env.WOMPI_API_URL}/widgets/payment_link?${wompiParams}`

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingCode,
      wompiUrl,
    })
  } catch (err) {
    console.error('Create booking error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
