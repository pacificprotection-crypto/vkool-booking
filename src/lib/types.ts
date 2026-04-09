import type { VehicleType, TintType } from './pricing'

// ---- Booking ----

export interface BookingFormData {
  // Customer
  name: string
  email: string
  phone: string
  // Vehicle
  make: string
  model: string
  year: string
  vehicleType: VehicleType
  // Service
  tintType: TintType
  // Appointment
  date: string        // ISO date string YYYY-MM-DD
  hour: number        // 8-16 (24h)
  // Pricing
  regularPrice: number
  webPrice: number
  finalPrice: number  // after coupon
  couponCode?: string
  couponDiscount?: number
  // Location
  locationId: string
}

export interface Booking extends BookingFormData {
  id: string
  bookingCode: string
  status: 'pending' | 'paid' | 'completed' | 'cancelled'
  wompiTransactionId?: string
  createdAt: string
}

// ---- Coupon ----

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'flat'
  value: number
  active: boolean
  expiresAt?: string
  usageLimit?: number
  usageCount: number
}

export interface CouponValidationResult {
  valid: boolean
  coupon?: Coupon
  discountAmount?: number
  finalPrice?: number
  error?: string
}

// ---- Calendar ----

export interface TimeSlot {
  hour: number
  label: string
  available: number   // slots remaining
  total: number
}

export interface CalendarDay {
  date: string        // YYYY-MM-DD
  slotsAvailable: number
  totalSlots: number
}

// ---- Location ----

export interface Location {
  id: string
  name: string
  address: string
  email: string
  phone: string
  calendarId: string
  active: boolean
}

export const LOCATIONS: Location[] = [
  {
    id: 'san-salvador',
    name: 'San Salvador',
    address: 'Final Calle La Mascota #986, San Salvador',
    email: 'v-koolsansalvador@pacifictrading.net',
    phone: '2297-8800',
    calendarId: process.env.GOOGLE_CALENDAR_ID || '',
    active: true,
  },
  // Future locations — set active: true when ready
  {
    id: 'santa-ana',
    name: 'Santa Ana',
    address: 'Santa Ana, El Salvador',
    email: 'v-koolsantaana@pacifictrading.net',
    phone: '',
    calendarId: '',
    active: false,
  },
  {
    id: 'san-miguel',
    name: 'San Miguel',
    address: 'San Miguel, El Salvador',
    email: 'v-koolsanmiguel@pacifictrading.net',
    phone: '',
    calendarId: '',
    active: false,
  },
  {
    id: 'usulutan',
    name: 'Usulután',
    address: 'Usulután, El Salvador',
    email: 'v-koolusulutan@pacifictrading.net',
    phone: '',
    calendarId: '',
    active: false,
  },
]
