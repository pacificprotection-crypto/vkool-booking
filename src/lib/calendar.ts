import { getWorkingHours, SLOTS_PER_HOUR } from './pricing'
import type { TimeSlot } from './types'

async function getCalendarClient() {
  const { google } = await import('googleapis')
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

/**
 * Returns how many bookings exist for a given date+hour in El Salvador time.
 * We look at the full hour window in El Salvador timezone (UTC-6).
 */
export async function getBookedCount(
  calendarId: string,
  date: string,   // YYYY-MM-DD
  hour: number    // 0-23 in El Salvador local time
): Promise<number> {
  try {
    const calendar = await getCalendarClient()

    // El Salvador is UTC-6, so we add 6 hours to convert to UTC
    const hourUTC = hour + 6
    
    // Handle day overflow (e.g. 4pm SV = 10pm UTC, still same day)
    // But 11pm SV = 5am UTC next day (edge case, not relevant for 8am-4pm hours)
    const dateObj = new Date(`${date}T00:00:00`)
    const timeMin = new Date(dateObj)
    timeMin.setHours(hourUTC, 0, 0, 0)
    
    const timeMax = new Date(dateObj)
    timeMax.setHours(hourUTC, 59, 59, 999)

    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      timeZone: 'America/El_Salvador',
    })

    return res.data.items?.length ?? 0
  } catch (err) {
    console.error('Calendar getBookedCount error:', err)
    return 0
  }
}

/**
 * Returns all time slots for a given date with availability counts.
 */
export async function getSlotsForDay(
  calendarId: string,
  date: string
): Promise<TimeSlot[]> {
  const dateObj = new Date(date + 'T12:00:00')
  const isSaturday = dateObj.getDay() === 6
  const hours = getWorkingHours(isSaturday)

  const slots = await Promise.all(
    hours.map(async (hour) => {
      const booked = await getBookedCount(calendarId, date, hour)
      const available = Math.max(0, SLOTS_PER_HOUR - booked)
      return {
        hour,
        label: formatHour(hour),
        available,
        total: SLOTS_PER_HOUR,
      }
    })
  )

  return slots
}

/**
 * Creates a confirmed booking event in Google Calendar.
 * Uses El Salvador timezone explicitly.
 */
export async function createCalendarEvent(params: {
  calendarId: string
  date: string
  hour: number
  customerName: string
  vehicleInfo: string
  tintType: string
  bookingCode: string
  phone: string
}): Promise<string | null> {
  try {
    const calendar = await getCalendarClient()
    const { date, hour, customerName, vehicleInfo, tintType, bookingCode, phone } = params

    // Build time string with El Salvador offset (-06:00)
    const hourStr = String(hour).padStart(2, '0')
    const endHour = String(hour + 2).padStart(2, '0')
    
    const startDateTime = `${date}T${hourStr}:00:00-06:00`
    const endDateTime = `${date}T${endHour}:00:00-06:00`

    const event = await calendar.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: `[${bookingCode}] ${customerName} — ${tintType}`,
        description: [
          `Cliente: ${customerName}`,
          `Tel: ${phone}`,
          `Vehículo: ${vehicleInfo}`,
          `Servicio: ${tintType}`,
          `Código: ${bookingCode}`,
        ].join('\n'),
        start: { dateTime: startDateTime, timeZone: 'America/El_Salvador' },
        end: { dateTime: endDateTime, timeZone: 'America/El_Salvador' },
        colorId: '5',
      },
    })

    return event.data.id ?? null
  } catch (err) {
    console.error('Calendar createEvent error:', err)
    return null
  }
}

function formatHour(h: number): string {
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}
