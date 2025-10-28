'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const prefilledEmail = searchParams.get('email') ?? ''
  const searchParamsKey = searchParams.toString()
  const [id, setId] = useState(prefilledEmail)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const paramEmail = searchParams.get('email') ?? ''
    if (paramEmail && paramEmail !== id) {
      setId(paramEmail)
    }
  }, [searchParams, searchParamsKey, id])

  async function resolveEmail(identifier: string): Promise<string> {
    if (identifier.includes('@')) return identifier
    const r = await fetch(`/api/auth/resolve-username?u=${encodeURIComponent(identifier)}`)
    if (!r.ok) throw new Error('Unknown username')
    const j = await r.json()
    return j.email as string
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const email = await resolveEmail(id)
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed'
      setErr(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Username (or email)</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={id}
            onChange={(event) => setId(event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={pw}
            onChange={(event) => setPw(event.target.value)}
            required
          />
        </label>
        {err ? <p className="text-red-600 text-sm">{err}</p> : null}
        <button disabled={busy} className="rounded bg-black text-white px-4 py-2 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
