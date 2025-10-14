'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    setMsg(null)
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg('If an account exists, a reset link has been sent.')
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <button
          className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </main>
  )
}
