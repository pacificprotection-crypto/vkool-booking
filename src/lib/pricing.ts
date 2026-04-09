// ============================================================
// VKOOL PRICING — Single source of truth
// Update prices here and they reflect everywhere automatically.
// ============================================================

export type VehicleType = 'sedan' | 'pickup' | 'midsuv' | 'fullsuv'
export type TintType = 'combo' | 'h20' | 'u5' | 'g05'

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  sedan:   'Sedán',
  pickup:  'Pickup 4 puertas',
  midsuv:  'Camioneta 2 filas',
  fullsuv: 'Camioneta 3 filas',
}

export const TINT_LABELS: Record<TintType, string> = {
  combo: 'Combinación 20% y 5%',
  h20:   'Full 20%',
  u5:    'U5%',
  g05:   'Full 5%',
}

export const TINT_DESCRIPTIONS: Record<TintType, string> = {
  combo: 'Laterales y trasera G05 · Parabrisas H20',
  h20:   'Todo el vehículo con H20 — máxima visibilidad',
  u5:    'Laterales y trasera G05 · Parabrisas H20 — paquete completo',
  g05:   'Todo el vehículo con G05 — mayor rechazo de calor',
}

export interface PricePoint {
  regular: number  // the price shown always (no auto-discount)
  web: number      // kept for compatibility — same as regular now
}

export const PRICES: Record<TintType, Record<VehicleType, PricePoint>> = {
  combo: {
    sedan:   { regular: 215, web: 215 },
    pickup:  { regular: 215, web: 215 },
    midsuv:  { regular: 225, web: 225 },
    fullsuv: { regular: 235, web: 235 },
  },
  h20: {
    sedan:   { regular: 215, web: 215 },
    pickup:  { regular: 215, web: 215 },
    midsuv:  { regular: 225, web: 225 },
    fullsuv: { regular: 235, web: 235 },
  },
  u5: {
    sedan:   { regular: 225, web: 225 },
    pickup:  { regular: 225, web: 225 },
    midsuv:  { regular: 235, web: 235 },
    fullsuv: { regular: 245, web: 245 },
  },
  g05: {
    sedan:   { regular: 235, web: 235 },
    pickup:  { regular: 235, web: 235 },
    midsuv:  { regular: 245, web: 245 },
    fullsuv: { regular: 255, web: 255 },
  },
}

export function getPrice(tint: TintType, vehicle: VehicleType): PricePoint {
  return PRICES[tint][vehicle]
}

// Slots per hour — increase this when capacity grows
export const SLOTS_PER_HOUR = 3

// Working hours (24h). Lunch break (12-13) is excluded automatically.
export const WORK_START = 8
export const WORK_END = 17   // last slot starts at 16:00 (4 PM)
export const LUNCH_START = 12
export const LUNCH_END = 13

// Saturday ends at noon
export const SAT_END = 12

export function getWorkingHours(isSaturday: boolean): number[] {
  const end = isSaturday ? SAT_END : WORK_END
  const hours: number[] = []
  for (let h = WORK_START; h < end; h++) {
    if (h >= LUNCH_START && h < LUNCH_END) continue
    hours.push(h)
  }
  return hours
}

export function formatHour(h: number): string {
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}
