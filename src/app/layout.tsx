import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cotizar — V-KOOL El Salvador',
  description: 'Reserva tu instalación de polarizado V-KOOL en línea. Selecciona tu vehículo, elige tu tint y agenda tu cita.',
  openGraph: {
    title: 'Cotizar — V-KOOL El Salvador',
    description: 'Reserva tu instalación de polarizado V-KOOL en línea.',
    url: 'https://cotizar.vkoolsv.com',
    siteName: 'V-KOOL El Salvador',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
