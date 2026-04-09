import { NextRequest, NextResponse } from 'next/server'
import { getSlotsForDay } from '@/lib/calendar'
import { LOCATIONS } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const locationId = searchParams.get('location') ?? 'san-salvador'

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Fecha inválida. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Reject past dates
    const requested = new Date(date + 'T12:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (requested < today) {
      return NextResponse.json({ error: 'No se pueden reservar fechas pasadas' }, { status: 400 })
    }

    // Reject Sundays
    if (requested.getDay() === 0) {
      return NextResponse.json({ error: 'No atendemos los domingos' }, { status: 400 })
    }

    const location = LOCATIONS.find(l => l.id === locationId && l.active)
    if (!location) {
      return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 })
    }

    const slots = await getSlotsForDay(location.calendarId, date)

    return NextResponse.json({ date, location: locationId, slots })
  } catch (err) {
    console.error('Calendar slots error:', err)
    return NextResponse.json({ error: 'Error al obtener horarios' }, { status: 500 })
  }
}
