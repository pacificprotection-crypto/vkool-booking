import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { code, basePrice } = await req.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Código requerido' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('active', true)
      .single()

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: 'Código no válido o expirado' })
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Este código ha expirado' })
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ valid: false, error: 'Este código ya alcanzó su límite de uso' })
    }

    const discountAmount =
      coupon.type === 'percentage'
        ? Math.round(basePrice * (coupon.value / 100))
        : coupon.value

    const finalPrice = Math.max(0, basePrice - discountAmount)

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        label: coupon.type === 'percentage'
          ? `${coupon.code} (${coupon.value}% off)`
          : `${coupon.code} ($${coupon.value} off)`,
      },
      discountAmount,
      finalPrice,
    })
  } catch (err) {
    console.error('Coupon validation error:', err)
    return NextResponse.json({ valid: false, error: 'Error al validar el código' }, { status: 500 })
  }
}
