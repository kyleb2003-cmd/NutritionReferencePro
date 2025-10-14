import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('hello_world')
    // Fallback query if hello_world RPC doesn't exist:
    const ping = await supabaseAdmin
      .from('pg_stat_activity')
      .select('pid', { count: 'exact', head: true })
    return NextResponse.json({
      ok: true,
      rpcExists: !rpcError && !!rpcData,
      dbReachable: !ping.error,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
