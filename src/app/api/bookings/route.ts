import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateBookingCode, dollarsToCents } from '@/lib/utils'
import type { BookingFormData } from '@/lib/types'

async function getWompiToken(): Promise<string> {
  const res = await fetch('https://id.wompi.sv/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY!,
      client_secret: process.env.WOMPI_PRIVATE_KEY!,
      audience: 'wompi_api',
    }),
  })
  if (!res.ok) throw new Error(`Wompi auth failed: ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

async function createWompiPaymentLink(params: {
  token: string
  bookingCode: string
  finalPrice: number
  redirectUrl: string
  description: string
}): Promise<string> {
  const res = await fetch('https://api.wompi.sv/EnlacePago', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      NombreEnlace: params.bookingCode,
      Monto: params.finalPrice,
      Descripcion: params.description,
      UrlRetorno: params.redirectUrl,
      PermitirCuotas: false,
      InactivarDespuestDePrimerUso: true,
    }),
  })
  if (!res.ok) throw new Error(`Wompi link failed: ${await res.text()}`)
  const data = await res.json()
  return data.Url || data.url || data.enlace || data.EnlacePago || data.urlEnlace
}

export async function POST(req: NextRequest) {
  try {
    const body: BookingFormData = await req.json()

    const required: (keyof BookingFormData)[] = [
      'name','email','phone','make','model','vehicleType','tintType','date','hour','finalPrice',
    ]
    for (const field of required) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Campo requerido: ${field}` }, { status: 400 })
      }
    }

    const supabase = createServerClient()
    const bookingCode = generateBookingCode(body.date)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vkool-booking.vercel.app'

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

    const token = await getWompiToken()
    const redirectUrl = `${appUrl}/confirm?booking=${booking.id}`
    const description = `V-KOOL ${body.tintType} - ${body.vehicleType} - ${body.make} ${body.model}`

    const wompiUrl = await createWompiPaymentLink({
      token,
      bookingCode,
      finalPrice: body.finalPrice,
      redirectUrl,
      description,
    })

    if (!wompiUrl) throw new Error('No URL returned from Wompi')

    return NextResponse.json({ success: true, bookingId: booking.id, bookingCode, wompiUrl })

  } catch (err) {
    console.error('Create booking error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
