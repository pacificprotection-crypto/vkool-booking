/**
 * Generates a unique, human-readable booking code.
 * Format: VK-YYYYMMDD-XXXXX (e.g. VK-20250411-04871)
 * Easy for staff to read aloud and look up.
 */
export function generateBookingCode(date: string): string {
  const datePart = date.replace(/-/g, '')
  const random = Math.floor(10000 + Math.random() * 90000)
  return `VK-${datePart}-${random}`
}

/**
 * Converts a Wompi amount (in centavos) to dollars.
 * Wompi always works in the smallest currency unit.
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}
