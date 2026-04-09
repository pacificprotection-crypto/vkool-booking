'use client'

import { useState, useCallback } from 'react'
import type { VehicleType, TintType } from '@/lib/pricing'
import {
  VEHICLE_LABELS, TINT_LABELS, TINT_DESCRIPTIONS,
  PRICES, getWorkingHours, formatHour,
} from '@/lib/pricing'
import type { BookingFormData, TimeSlot } from '@/lib/types'

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
  'Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAYS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

type Step = 1 | 2 | 3

export default function CotizarPage() {
  const [step, setStep] = useState<Step>(1)

  // Step 1 fields
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [make, setMake]       = useState('')
  const [model, setModel]     = useState('')
  const [year, setYear]       = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [tintType, setTintType]       = useState<TintType | ''>('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Step 2 fields
  const [viewYear, setViewYear]   = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate]   = useState<string | null>(null)
  const [selectedHour, setSelectedHour]   = useState<number | null>(null)
  const [slots, setSlots]                 = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading]   = useState(false)

  // Step 3 fields
  const [couponCode, setCouponCode]       = useState('')
  const [couponResult, setCouponResult]   = useState<{valid:boolean;label?:string;discountAmount?:number;finalPrice?:number;error?:string} | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [submitting, setSubmitting]       = useState(false)

  const today = new Date(); today.setHours(0,0,0,0)

  // ---- Pricing ----
  const pricePoint = vehicleType && tintType ? PRICES[tintType as TintType][vehicleType as VehicleType] : null
  const webPrice     = pricePoint?.web ?? 0
  const regularPrice = pricePoint?.regular ?? 0
  const finalPrice   = couponResult?.valid ? (couponResult.finalPrice ?? webPrice) : webPrice

  // ---- Step 1 validation ----
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const step1Valid = name && phone && emailValid && make && model && vehicleType && tintType

  const blur = (field: string) => setTouched(t => ({ ...t, [field]: true }))

  // ---- Calendar helpers ----
  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
  function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }

  function daySlots(dateStr: string) {
    const isSat = new Date(dateStr + 'T12:00:00').getDay() === 6
    return getWorkingHours(isSat).length * 3 // rough max
  }

  async function selectDate(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedHour(null)
    setSlots([])
    setSlotsLoading(true)
    try {
      const res = await fetch(`/api/calendar?date=${dateStr}&location=san-salvador`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null); setSelectedHour(null); setSlots([])
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null); setSelectedHour(null); setSlots([])
  }

  // ---- Coupon ----
  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), basePrice: webPrice }),
      })
      const data = await res.json()
      setCouponResult(data)
    } catch {
      setCouponResult({ valid: false, error: 'Error al validar el código' })
    } finally {
      setCouponLoading(false)
    }
  }

  // ---- Submit → create booking → redirect to Wompi ----
  async function handlePay() {
    if (!vehicleType || !tintType || !selectedDate || selectedHour === null) return
    setSubmitting(true)
    try {
      const payload: BookingFormData = {
        name, email, phone, make, model, year,
        vehicleType: vehicleType as VehicleType,
        tintType: tintType as TintType,
        date: selectedDate,
        hour: selectedHour,
        regularPrice,
        webPrice,
        finalPrice,
        couponCode: couponResult?.valid ? couponCode : undefined,
        couponDiscount: couponResult?.valid ? couponResult.discountAmount : undefined,
        locationId: 'san-salvador',
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!data.wompiUrl) throw new Error('No Wompi URL returned')

      // Redirect customer to Wompi payment page
      window.location.href = data.wompiUrl
    } catch (err) {
      alert('Ocurrió un error. Por favor intenta de nuevo.')
      setSubmitting(false)
    }
  }

  // ---- Calendar render ----
  function renderCalendar() {
    const cells = []
    const firstDay = firstDayOfMonth(viewYear, viewMonth)
    const totalDays = daysInMonth(viewYear, viewMonth)

    // Day-of-week headers
    const headers = DAYS_ES.map(d => (
      <div key={d} className="cal-dow">{d}</div>
    ))

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e${i}`} className="cal-day empty" />)
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const dateObj = new Date(dateStr + 'T12:00:00')
      const isSun  = dateObj.getDay() === 0
      const isPast = dateObj < today
      const isToday = dateObj.getTime() === today.getTime()
      const isSel  = selectedDate === dateStr
      const isSat  = dateObj.getDay() === 6

      let cls = 'cal-day '
      if (isSun || isPast) cls += isSun ? 'sunday' : 'past'
      else if (isSel) cls += 'selected'
      else cls += 'available'
      if (isToday) cls += ' today'

      const maxSlots = getWorkingHours(isSat).length * 3
      const slotsLabel = isSun || isPast ? '' : `${maxSlots} cupos`

      cells.push(
        <div
          key={dateStr}
          className={cls}
          onClick={!isSun && !isPast ? () => selectDate(dateStr) : undefined}
        >
          <span className="day-num">{d}</span>
          {!isSun && !isPast && <span className="day-slots">{slotsLabel}</span>}
        </div>
      )
    }

    return (
      <div className="cal-grid">
        {headers}
        {cells}
      </div>
    )
  }

  const stepLabel = (n: number, label: string, current: Step) => {
    const cls = `step-item ${n < current ? 'done' : n === current ? 'active' : ''}`
    return (
      <div className={cls} key={n}>
        <div className="step-dot">{n < current ? '✓' : n}</div>
        <span>{label}</span>
        {n < 3 && <div className="step-line" />}
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <header className="site-header" style={{maxWidth:'560px',width:'100%',background:'transparent',border:'none',marginBottom:'8px',padding:'20px 16px 0'}}>
        <a href="https://www.vkoolsv.com" className="site-logo">V·KOOL</a>
        <span style={{fontSize:'12px',color:'#555'}}>San Salvador</span>
      </header>

      <div className="form-container">
        {/* Progress bar */}
        <div className="steps-bar" style={{margin:'16px 0 24px'}}>
          {stepLabel(1, 'Tu información', step)}
          {stepLabel(2, 'Fecha y hora', step)}
          {stepLabel(3, 'Pago', step)}
        </div>

        {/* ======================== STEP 1 ======================== */}
        {step === 1 && (
          <>
            <div className="card">
              <div className="section-label">Datos personales</div>
              <div className="row-2">
                <div className={`field ${touched.name && !name ? 'invalid' : ''}`}>
                  <label>Nombre completo</label>
                  <input value={name} onChange={e => setName(e.target.value)} onBlur={() => blur('name')} placeholder="Ej. Carlos Martínez" />
                  <span className="field-error">Requerido</span>
                </div>
                <div className={`field ${touched.phone && !phone ? 'invalid' : ''}`}>
                  <label>Teléfono</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => blur('phone')} placeholder="7000-0000" />
                  <span className="field-error">Requerido</span>
                </div>
              </div>
              <div className={`field ${touched.email && !emailValid ? 'invalid' : ''}`}>
                <label>Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => blur('email')} placeholder="tucorreo@ejemplo.com" />
                <span className="field-error">Ingresa un correo válido</span>
              </div>
            </div>

            <div className="card">
              <div className="section-label">Datos del vehículo</div>
              <div className="row-3">
                <div className={`field ${touched.make && !make ? 'invalid' : ''}`}>
                  <label>Marca</label>
                  <input value={make} onChange={e => setMake(e.target.value)} onBlur={() => blur('make')} placeholder="Toyota" />
                  <span className="field-error">Requerido</span>
                </div>
                <div className={`field ${touched.model && !model ? 'invalid' : ''}`}>
                  <label>Modelo</label>
                  <input value={model} onChange={e => setModel(e.target.value)} onBlur={() => blur('model')} placeholder="Corolla" />
                  <span className="field-error">Requerido</span>
                </div>
                <div className="field">
                  <label>Año</label>
                  <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2022" min="1990" max="2026" />
                </div>
              </div>
              <div className={`field ${touched.vehicleType && !vehicleType ? 'invalid' : ''}`}>
                <label>Tipo de vehículo</label>
                <select value={vehicleType} onChange={e => setVehicleType(e.target.value as VehicleType)} onBlur={() => blur('vehicleType')}>
                  <option value="">— Selecciona —</option>
                  {Object.entries(VEHICLE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <span className="field-error">Selecciona el tipo</span>
              </div>
            </div>

            <div className="card">
              <div className="section-label">Selección de tint</div>
              <div className="tint-grid">
                {(['combo','h20','u5','g05'] as TintType[]).map((t, i) => {
                  const badges = [
                    <span key="b" className="badge badge-popular">Más popular</span>,
                    <span key="b" className="badge badge-gold">Full claridad</span>,
                    <span key="b" className="badge badge-purple">Premium</span>,
                    <span key="b" className="badge badge-coral">Máximo rechazo</span>,
                  ]
                  const p = vehicleType ? PRICES[t][vehicleType as VehicleType] : null
                  return (
                    <div key={t} className={`tint-card ${tintType === t ? 'selected' : ''}`} onClick={() => setTintType(t)}>
                      {badges[i]}
                      <div className="tint-name">{TINT_LABELS[t]}</div>
                      <div className="tint-desc">{TINT_DESCRIPTIONS[t]}</div>
                      <div style={{display:'flex',alignItems:'baseline'}}>
                        <span className="tint-price">{p ? `$${p.web}` : '—'}</span>
                        
                      </div>
                    </div>
                  )
                })}
              </div>

              {pricePoint && (
                <div className="card-dark" style={{marginTop:'16px'}}>
                  <div className="price-total" style={{paddingTop:0}}>
                    <span className="price-total-label">Precio especial</span>
                    <span className="price-total-val">${webPrice}</span>
                  </div>
                </div>
              )}
            </div>

            <button className="btn-primary" disabled={!step1Valid} onClick={() => setStep(2)}>
              Seleccionar fecha y hora →
            </button>
          </>
        )}

        {/* ======================== STEP 2 ======================== */}
        {step === 2 && (
          <>
            <div className="order-pill">
              <div>
                <div className="order-pill-label">{vehicleType ? VEHICLE_LABELS[vehicleType as VehicleType] : ''} · {tintType ? TINT_LABELS[tintType as TintType] : ''}</div>
                <div className="order-pill-sub">{name}</div>
              </div>
              <div>
                <span className="order-pill-price">${webPrice}</span>
              </div>
            </div>

            <div className="card">
              <div className="section-label">Selecciona una fecha</div>
              <div className="cal-nav">
                <button className="cal-btn" onClick={prevMonth}>‹</button>
                <div className="cal-month">{MONTHS_ES[viewMonth]} {viewYear}</div>
                <button className="cal-btn" onClick={nextMonth}>›</button>
              </div>
              {renderCalendar()}
            </div>

            {selectedDate && (
              <div className="card">
                <div className="section-label">
                  Horarios — {DAYS_FULL[new Date(selectedDate+'T12:00:00').getDay()]} {new Date(selectedDate+'T12:00:00').getDate()} de {MONTHS_ES[new Date(selectedDate+'T12:00:00').getMonth()]}
                </div>
                {slotsLoading ? (
                  <div style={{padding:'24px 0',textAlign:'center'}}><div className="spinner" /></div>
                ) : (
                  <div className="time-grid">
                    {slots.map(slot => (
                      <div
                        key={slot.hour}
                        className={`time-slot ${selectedHour === slot.hour ? 'selected' : ''} ${slot.available === 0 ? 'full' : ''}`}
                        onClick={slot.available > 0 ? () => setSelectedHour(slot.hour) : undefined}
                      >
                        <div className="ts-hour">{formatHour(slot.hour)}</div>
                        <div className="ts-avail">
                          {slot.available === 0 ? 'Sin cupos' : `${slot.available}/${slot.total} libres`}
                        </div>
                      </div>
                    ))}
                    {/* Lunch break placeholder for weekdays */}
                    {selectedDate && new Date(selectedDate+'T12:00:00').getDay() !== 6 && (
                      <div className="time-slot lunch">
                        <div className="ts-hour">12:00 PM</div>
                        <div className="ts-avail">Almuerzo</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
              <button className="btn-secondary" style={{marginTop:0}} onClick={() => setStep(1)}>← Volver</button>
              <button
                className="btn-primary"
                style={{marginTop:0}}
                disabled={!selectedDate || selectedHour === null}
                onClick={() => setStep(3)}
              >
                Continuar al pago →
              </button>
            </div>
          </>
        )}

        {/* ======================== STEP 3 ======================== */}
        {step === 3 && (
          <>
            <div className="order-pill">
              <div>
                <div className="order-pill-label">{vehicleType ? VEHICLE_LABELS[vehicleType as VehicleType] : ''} · {tintType ? TINT_LABELS[tintType as TintType] : ''}</div>
                <div className="order-pill-sub">
                  {selectedDate && selectedHour !== null
                    ? `${DAYS_FULL[new Date(selectedDate+'T12:00:00').getDay()]} ${new Date(selectedDate+'T12:00:00').getDate()} de ${MONTHS_ES[new Date(selectedDate+'T12:00:00').getMonth()]} · ${formatHour(selectedHour)}`
                    : ''}
                </div>
              </div>
              <div>
                <span className="order-pill-price">${finalPrice}</span>
              </div>
            </div>

            <div className="card">
              <div className="section-label">Código de descuento</div>
              <div className="field">
                <div className="coupon-row">
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Ej. WEB10"
                    style={{textTransform:'uppercase'}}
                  />
                  <button className="coupon-btn" onClick={applyCoupon} disabled={couponLoading}>
                    {couponLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
                {couponResult && (
                  <div className={`coupon-msg ${couponResult.valid ? 'ok' : 'err'}`}>
                    {couponResult.valid ? `✓ ${couponResult.label}` : couponResult.error}
                  </div>
                )}
              </div>

              <div className="card-dark" style={{marginTop:'4px'}}>
                <div className="price-row"><span>Servicio</span><span>{tintType ? TINT_LABELS[tintType as TintType] : ''}</span></div>
                <div className="price-row"><span>Precio</span><span>${regularPrice}</span></div>
                {couponResult?.valid && (
                  <div className="price-row saving"><span>Descuento ({couponResult?.label})</span><span>-${couponResult?.discountAmount}</span></div>
                )}
                <div className="price-divider" />
                <div className="price-total">
                  <span className="price-total-label">Total</span>
                  <span className="price-total-val">${finalPrice}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--green)'}} />
                <span style={{fontSize:'13px',color:'#aaa'}}>Pago seguro procesado por Wompi</span>
              </div>
              <p style={{fontSize:'13px',color:'#555',lineHeight:'1.7',marginBottom:'12px'}}>
                Al hacer clic en <strong style={{color:'#aaa'}}>Ir al pago</strong>, serás redirigido a la plataforma segura de Wompi
                para ingresar los datos de tu tarjeta. Aceptamos Visa, Mastercard y American Express.
              </p>
              <div style={{display:'flex',gap:'8px'}}>
                {['VISA','MC','AMEX'].map(b => (
                  <div key={b} style={{
                    background:'var(--bg-card)',border:'0.5px solid var(--border)',
                    borderRadius:'4px',padding:'4px 10px',fontSize:'11px',fontWeight:'600',
                    color: b==='VISA'?'#1A6CE1':b==='MC'?'#E24B4A':'var(--green)'
                  }}>{b}</div>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
              <button className="btn-secondary" style={{marginTop:0}} onClick={() => setStep(2)}>← Volver</button>
              <button className="btn-primary" style={{marginTop:0}} disabled={submitting} onClick={handlePay}>
                {submitting ? <div className="spinner" /> : `Ir al pago — $${finalPrice} →`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
