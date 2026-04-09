import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>
}) {
  const params = await searchParams
  const bookingId = params.booking

  if (!bookingId) {
    return <div style={{color:'white',padding:'40px',fontFamily:'monospace',background:'#111',minHeight:'100vh'}}>NO BOOKING ID — params: {JSON.stringify(params)}</div>
  }

  let booking = null
  let dbError = null

  try {
    const supabase = createServerClient()
    const result = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()
    booking = result.data
    dbError = result.error
  } catch (e: any) {
    dbError = e
  }

  return (
    <div style={{color:'white',padding:'40px',fontFamily:'monospace',background:'#111',minHeight:'100vh'}}>
      <p>ID: {bookingId}</p>
      <p>Found: {booking ? 'YES' : 'NO'}</p>
      <p>Error: {dbError ? JSON.stringify(dbError) : 'none'}</p>
      <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING'}</p>
      <p>Key: {process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}</p>
      {booking && <p>Name: {(booking as any).name}</p>}
    </div>
  )
}