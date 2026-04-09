import { createServerClient } from '@/lib/supabase'
import { TINT_LABELS, VEHICLE_LABELS, formatHour } from '@/lib/pricing'
import type { VehicleType, TintType } from '@/lib/pricing'

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
  searchParams: { booking?: string; id?: string }
}) {
  const bookingId = searchParams.booking ?? searchParams.id

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

  const isPaid = booking.status === 'paid'

  return (
    <div className="page-wrapper">
      <header style={{width:'100%',maxWidth:'560px',padding:'20px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
        <a href="https://www.vkoolsv.com" className="site-logo">V·KOOL</a>
      </header>

      <div className="form-container">
        {/* Steps — all done */}
        <div className="steps-bar" style={{margin:'16px 0 24px'}}>
          {[['1','Tu información'],['2','Fecha y hora'],['3','Pago'],['4','Confirmación']].map(([n, l], i) => (
            <div key={n} className="step-item done">
              <div className="step-dot">✓</div>
              <span>{l}</span>
              {i < 3 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* Success icon */}
        <div style={{textAlign:'center',padding:'8px 0 24px'}}>
          <div className="success-icon-ring">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14.5L11.5 20L22 9" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{fontSize:'22px',fontWeight:'500',color:'#1a1a1a',marginBottom:'6px'}}>
            {isPaid ? '¡Reserva confirmada!' : 'Reserva recibida'}
          </h1>
          <p style={{fontSize:'14px',color:'#888888',lineHeight:'1.6'}}>
            {isPaid
              ? <>Pago procesado por Wompi.<br/>Enviamos confirmación a <span style={{color:'#555555'}}>{booking.email}</span></>
              : 'Tu reserva está siendo procesada. Recibirás un correo de confirmación pronto.'
            }
          </p>
        </div>

        {/* Booking code */}
        <div className="card-dark" style={{textAlign:'center',marginBottom:'16px',padding:'20px'}}>
          <div className="section-label" style={{textAlign:'center'}}>Código de reserva</div>
          <div className="booking-code-display">{booking.booking_code}</div>
          <p style={{fontSize:'12px',color:'#999999',marginTop:'8px'}}>Preséntalo al llegar a la sucursal</p>
        </div>

        {/* Booking details */}
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
              <span style={{color:'#888888'}}>{label}</span>
              <span style={{color:'#333333',textAlign:'right',maxWidth:'60%'}}>{val}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 0',fontSize:'14px'}}>
            <span style={{color:'#555555',fontWeight:'500'}}>Total pagado</span>
            <span style={{fontSize:'22px',fontWeight:'500',color:'var(--gold)'}}>
              ${booking.final_price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* What's next */}
        <div className="card">
          <div className="section-label">¿Qué sigue?</div>
          {[
            { done: true,  title: 'Pago recibido',                   sub: 'Procesado por Wompi' },
            { done: true,  title: 'Correo de confirmación enviado',   sub: booking.email },
            { done: false, title: 'Llega a la sucursal',             sub: `${formatDateFull(booking.date)} · ${formatHour(booking.hour)} · Muestra tu código` },
            { done: false, title: 'Instalación completada',           sub: '1 a 2 horas · Sala de espera disponible' },
          ].map((item, i, arr) => (
            <div key={i} style={{display:'flex',gap:'12px',padding:'10px 0',position:'relative'}}>
              {i < arr.length - 1 && (
                <div style={{position:'absolute',left:'9px',top:'26px',bottom:'-10px',width:'0.5px',background:'#e8e4de'}} />
              )}
              <div style={{
                width:'20px',height:'20px',borderRadius:'50%',flexShrink:0,marginTop:'2px',
                display:'flex',alignItems:'center',justifyContent:'center',
                background: item.done ? 'rgba(29,158,117,0.12)' : '#1a1a1a',
                border: `1px solid ${item.done ? '#1D9E75' : '#2a2a2a'}`,
              }}>
                {item.done && <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#1D9E75'}} />}
              </div>
              <div>
                <div style={{fontSize:'13px',color:'#333333',fontWeight:'500'}}>{item.title}</div>
                <div style={{fontSize:'11px',color:'#888888',marginTop:'2px'}}>{item.sub}</div>
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
        <p style={{color:'#888888',fontSize:'14px',lineHeight:'1.6',marginBottom:'24px'}}>{message}</p>
        <a href="https://www.vkoolsv.com/contacto" style={{color:'var(--gold)',fontSize:'14px'}}>Contactar a V-KOOL →</a>
      </div>
    </div>
  )
}
