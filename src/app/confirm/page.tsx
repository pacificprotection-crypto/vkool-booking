import { createServerClient } from '@/lib/supabase'
import { TINT_LABELS, VEHICLE_LABELS, formatHour } from '@/lib/pricing'
import { sendCustomerConfirmation, sendCompanyNotification } from '@/lib/emails'
import { createCalendarEvent } from '@/lib/calendar'
import { LOCATIONS } from '@/lib/types'
import type { VehicleType, TintType } from '@/lib/pricing'
import type { Booking } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio',
  'agosto','septiembre','octubre','noviembre','diciembre']
const DAYS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const bookingId = params.booking
  const transactionId = params.idTransaccion

  if (!bookingId) {
    return <ErrorScreen message="No se encontró el ID de reserva." />
  }

  const supabase = createServerClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    return <ErrorScreen message="No se encontró la reserva. Contacta a V-KOOL si ya realizaste el pago." />
  }

  if (transactionId && booking.status === 'pending') {
    await supabase
      .from('bookings')
      .update({ status: 'paid', wompi_transaction_id: transactionId })
      .eq('id', bookingId)

    const confirmedBooking: Booking = {
      id: booking.id,
      bookingCode: booking.booking_code,
      status: 'paid',
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      make: booking.make,
      model: booking.model,
      year: booking.year,
      vehicleType: booking.vehicle_type,
      tintType: booking.tint_type,
      date: booking.date,
      hour: booking.hour,
      locationId: booking.location_id,
      regularPrice: booking.regular_price,
      webPrice: booking.web_price,
      finalPrice: booking.final_price,
      couponCode: booking.coupon_code,
      couponDiscount: booking.coupon_discount,
      wompiTransactionId: transactionId,
      createdAt: booking.created_at,
    }

    const location = LOCATIONS.find(l => l.id === booking.location_id)
    if (location?.calendarId) {
      await createCalendarEvent({
        calendarId: location.calendarId,
        date: booking.date,
        hour: booking.hour,
        customerName: booking.name,
        vehicleInfo: `${booking.make} ${booking.model} ${booking.year}`,
        tintType: booking.tint_type,
        bookingCode: booking.booking_code,
        phone: booking.phone,
      })
    }

    const emailResults = await Promise.allSettled([
      sendCustomerConfirmation(confirmedBooking),
      sendCompanyNotification(confirmedBooking),
    ])
    emailResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error('Email ' + i + ' failed:', result.reason)
      } else {
        console.log('Email ' + i + ' sent successfully')
      }
    })

    booking.status = 'paid'
    booking.wompi_transaction_id = transactionId
  }

  const isPaid = booking.status === 'paid'

  return (
    <div className="page-wrapper">
      <header style={{width:'100%',maxWidth:'560px',padding:'20px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',background:'#0a0a0a',borderRadius:'12px'}}>
        <a href="https://www.vkoolsv.com" style={{display:'flex',alignItems:'center'}}>
          <img src="https://static.wixstatic.com/media/78b827_c1abfd50c9f9414c983db6e5158b88e1~mv2.png/v1/fill/w_317,h_89,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/LOGO%20V-KOOL%20BLANCO-01.png" alt="V-KOOL" style={{height:'36px',width:'auto'}} />
        </a>
        <span style={{fontSize:'12px',color:'#aaa'}}>San Salvador</span>
      </header>

      <div className="form-container">
        <div className="steps-bar" style={{margin:'16px 0 24px'}}>
          {[['1','Tu información'],['2','Fecha y hora'],['3','Pago'],['4','Confirmación']].map(([n, l], i) => (
            <div key={n} className="step-item done">
              <div className="step-dot">✓</div>
              <span>{l}</span>
              {i < 3 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div style={{textAlign:'center',padding:'8px 0 24px'}}>
          <div className="success-icon-ring">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14.5L11.5 20L22 9" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{fontSize:'22px',fontWeight:'500',color:'#1a1a1a',marginBottom:'6px'}}>
            {isPaid ? '¡Reserva confirmada!' : '¡Cita agendada!'}
          </h1>
          <p style={{fontSize:'14px',color:'#888',lineHeight:'1.6'}}>
            {isPaid
              ? <span>Pago procesado exitosamente.<br/>Enviamos confirmación a <span style={{color:'#555'}}>{booking.email}</span></span>
              : <span>Tu cita ha sido agendada.<br/>El pago se realiza en sucursal.</span>
            }
          </p>
        </div>

        <div className="card-dark" style={{textAlign:'center',marginBottom:'16px',padding:'20px'}}>
          <div className="section-label" style={{textAlign:'center'}}>Código de reserva</div>
          <div className="booking-code-display">{booking.booking_code}</div>
          <p style={{fontSize:'12px',color:'#999',marginTop:'8px'}}>Preséntalo al llegar a la sucursal</p>
        </div>

        <div className="card">
          <div className="section-label">Resumen de tu cita</div>
          {[
            ['Servicio', `${TINT_LABELS[booking.tint_type as TintType]} · ${VEHICLE_LABELS[booking.vehicle_type as VehicleType]}`],
            ['Cliente', booking.name],
            ['Vehículo', `${booking.make} ${booking.model} ${booking.year}`],
            ['Fecha', formatDateFull(booking.date)],
            ['Hora', formatHour(booking.hour)],
            ['Sucursal', 'San Salvador — Final Calle La Mascota #986'],
            ['Duración estimada', '1 a 2 horas'],
          ].map(([label, val]) => (
            <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid #eeebe6',fontSize:'13px'}}>
              <span style={{color:'#888'}}>{label}</span>
              <span style={{color:'#333',textAlign:'right',maxWidth:'60%'}}>{val}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 0',fontSize:'14px'}}>
            <span style={{color:'#555',fontWeight:'500'}}>{isPaid ? 'Total pagado' : 'Total a pagar en sucursal'}</span>
            <span style={{fontSize:'22px',fontWeight:'500',color:'var(--gold)'}}>
              ${booking.final_price.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="section-label">¿Qué sigue?</div>
          {[
            { done: true,  title: isPaid ? 'Pago recibido' : 'Cita confirmada', sub: isPaid ? 'Procesado por Wompi' : 'Reserva registrada exitosamente' },
            { done: true,  title: 'Correo de confirmación enviado', sub: booking.email },
            { done: false, title: 'Llega a la sucursal', sub: formatDateFull(booking.date) + ' · ' + formatHour(booking.hour) + ' · Muestra tu código' },
            { done: false, title: 'Instalación completada', sub: '1 a 2 horas · Sala de espera disponible' },
          ].map((item, i, arr) => (
            <div key={i} style={{display:'flex',gap:'12px',padding:'10px 0',position:'relative'}}>
              {i < arr.length - 1 && (
                <div style={{position:'absolute',left:'9px',top:'26px',bottom:'-10px',width:'0.5px',background:'#e8e4de'}} />
              )}
              <div style={{
                width:'20px',height:'20px',borderRadius:'50%',flexShrink:0,marginTop:'2px',
                display:'flex',alignItems:'center',justifyContent:'center',
                background: item.done ? 'rgba(29,158,117,0.12)' : '#f7f7f5',
                border: '1px solid ' + (item.done ? '#1D9E75' : '#e0ddd8'),
              }}>
                {item.done && <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#1D9E75'}} />}
              </div>
              <div>
                <div style={{fontSize:'13px',color:'#333',fontWeight:'500'}}>{item.title}</div>
                <div style={{fontSize:'11px',color:'#888',marginTop:'2px'}}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <a href="https://www.vkoolsv.com" className="btn-secondary" style={{display:'block',textDecoration:'none',marginTop:'8px',textAlign:'center',padding:'12px'}}>
          Volver al sitio V-KOOL
        </a>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="page-wrapper" style={{justifyContent:'center',paddingTop:'60px'}}>
      <div style={{textAlign:'center',maxWidth:'400px',padding:'0 16px'}}>
        <div style={{fontSize:'32px',marginBottom:'16px'}}>⚠</div>
        <h2 style={{color:'#1a1a1a',marginBottom:'8px'}}>Algo salió mal</h2>
        <p style={{color:'#888',fontSize:'14px',lineHeight:'1.6',marginBottom:'24px'}}>{message}</p>
        <a href="https://www.vkoolsv.com/contacto" style={{color:'var(--gold)',fontSize:'14px'}}>Contactar a V-KOOL →</a>
      </div>
    </div>
  )
}
