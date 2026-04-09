import { Resend } from 'resend'
import type { Booking } from './types'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatDate(dateStr: string): string {
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const d = new Date(dateStr + 'T12:00:00')
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatHour(h: number): string {
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

// ---- Customer confirmation email ----

function customerEmailHtml(booking: Booking): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reserva confirmada — V-KOOL</title>
</head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:24px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

      <!-- Header -->
      <tr><td style="background:#0a0a0a;padding:24px;text-align:center;border-radius:8px 8px 0 0">
        <span style="font-size:22px;font-weight:500;color:#fff;letter-spacing:4px">V·KOOL</span>
      </td></tr>
      <tr><td style="height:3px;background:#d4a843"></td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:32px 24px">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 8px">Hola ${booking.name},</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px">
          Tu reserva ha sido confirmada y tu pago procesado exitosamente.<br>
          Te esperamos el <strong style="color:#1a1a1a">${formatDate(booking.date)} a las ${formatHour(booking.hour)}</strong>.
        </p>

        <!-- Booking code -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;border:1px solid #e8e4dc;border-radius:6px;margin-bottom:24px">
          <tr><td style="padding:20px;text-align:center">
            <p style="font-size:11px;color:#999;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Código de reserva</p>
            <p style="font-size:28px;font-weight:700;color:#0a0a0a;letter-spacing:5px;font-family:'Courier New',monospace;margin:0">${booking.bookingCode}</p>
          </td></tr>
        </table>

        <!-- Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ede8;border-radius:6px;font-size:13px;margin-bottom:24px">
          ${[
            ['Servicio', `${booking.tintType} · ${booking.vehicleType}`],
            ['Vehículo', `${booking.make} ${booking.model} ${booking.year}`],
            ['Fecha', formatDate(booking.date)],
            ['Hora', formatHour(booking.hour)],
            ['Sucursal', 'Final Calle La Mascota #986, San Salvador'],
            ['Duración estimada', '1 a 2 horas'],
            ['Total pagado', `$${booking.finalPrice.toFixed(2)} USD`],
          ].map(([label, val], i, arr) => `
            <tr style="border-bottom:${i < arr.length - 1 ? '1px solid #f0ede8' : 'none'}">
              <td style="padding:10px 12px;color:#999;width:45%">${label}</td>
              <td style="padding:10px 12px;color:#1a1a1a;font-weight:500">${val}</td>
            </tr>
          `).join('')}
        </table>

        <p style="font-size:12px;color:#999;line-height:1.7;margin:0 0 20px">
          Llega puntual y presenta tu código de reserva al técnico. Si necesitas cancelar o reagendar,
          contáctanos al PBX <strong>2297-8800</strong> con al menos 24 horas de anticipación.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin:0 auto 0">
          <tr><td style="background:#d4a843;border-radius:4px;padding:12px 28px;text-align:center">
            <a href="https://www.vkoolsv.com" style="font-size:14px;font-weight:600;color:#0a0a0a;text-decoration:none">Visitar V-KOOL</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f4f2ee;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e8e4dc;border-top:none">
        <p style="font-size:11px;color:#999;margin:0;line-height:1.8">
          V-KOOL El Salvador · Pacific Trading S.A. de C.V.<br>
          Final Calle La Mascota #986, San Salvador<br>
          PBX: 2297-8800 · <a href="mailto:v-koolsansalvador@pacifictrading.net" style="color:#d4a843">v-koolsansalvador@pacifictrading.net</a><br><br>
          © ${new Date().getFullYear()} V-KOOL El Salvador. Todos los derechos reservados.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ---- Company notification email ----

function companyEmailHtml(booking: Booking): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nueva reserva — V-KOOL</title></head>
<body style="margin:0;padding:24px;background:#f4f2ee;font-family:Arial,sans-serif">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #e8e4dc;overflow:hidden">
  <tr><td style="background:#0a0a0a;padding:16px 20px">
    <span style="color:#d4a843;font-size:13px;font-weight:600;letter-spacing:1px">NUEVA RESERVA EN LÍNEA — V·KOOL SAN SALVADOR</span>
  </td></tr>
  <tr><td style="padding:20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
      ${[
        ['Código', booking.bookingCode],
        ['Cliente', booking.name],
        ['Teléfono', booking.phone],
        ['Correo', booking.email],
        ['Vehículo', `${booking.make} ${booking.model} ${booking.year}`],
        ['Tipo', booking.vehicleType],
        ['Servicio', booking.tintType],
        ['Fecha', formatDate(booking.date)],
        ['Hora', formatHour(booking.hour)],
        ['Total cobrado', `$${booking.finalPrice.toFixed(2)} USD ✓ PAGADO`],
        ...(booking.couponCode ? [['Cupón usado', `${booking.couponCode} (-$${booking.couponDiscount})`]] : []),
      ].map(([label, val]) => `
        <tr>
          <td style="padding:6px 0;color:#999;width:38%;border-bottom:1px solid #f4f2ee">${label}</td>
          <td style="padding:6px 0;color:#1a1a1a;font-weight:500;border-bottom:1px solid #f4f2ee">${val}</td>
        </tr>
      `).join('')}
    </table>
  </td></tr>
  <tr><td style="background:#f4f2ee;padding:12px 20px;font-size:11px;color:#999">
    Enviado automáticamente por el sistema de reservas en línea de V-KOOL.
  </td></tr>
</table>
</body>
</html>`
}

// ---- Public send functions ----

export async function sendCustomerConfirmation(booking: Booking) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: booking.email,
    subject: `Reserva confirmada — V-KOOL ${booking.bookingCode}`,
    html: customerEmailHtml(booking),
  })
}

export async function sendCompanyNotification(booking: Booking) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.COMPANY_EMAIL!,
    subject: `[Nueva reserva] ${booking.bookingCode} — ${booking.name} · ${formatDate(booking.date)} ${formatHour(booking.hour)}`,
    html: companyEmailHtml(booking),
  })
}
