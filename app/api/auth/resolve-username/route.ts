import { NextResponse } from 'next/server'
import { admin } from '@/lib/supa-admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const u = new URL(req.url).searchParams.get('u')?.trim()
    if (!u) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    const supa = admin()
    const r = await supa.from('profiles').select('email').eq('username', u).single()
    if (r.error || !r.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ email: r.data.email })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Resolve failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
