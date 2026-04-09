import { getWorkingHours, SLOTS_PER_HOUR } from './pricing'
import type { TimeSlot } from './types'

// Lazily initialise the Google API client so it only runs server-side
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
 * Returns how many bookings already exist for a given date+hour
 * by counting events in Google Calendar that start at that hour.
 */
export async function getBookedCount(
  calendarId: string,
  date: string,   // YYYY-MM-DD
  hour: number
): Promise<number> {
  try {
    const calendar = await getCalendarClient()
    const timeMin = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`)
    const timeMax = new Date(`${date}T${String(hour).padStart(2, '0')}:59:59`)

    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
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

    const start = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000) // 2 hr block

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
        start: { dateTime: start.toISOString(), timeZone: 'America/El_Salvador' },
        end: { dateTime: end.toISOString(), timeZone: 'America/El_Salvador' },
        colorId: '5', // banana yellow — easy to spot
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
