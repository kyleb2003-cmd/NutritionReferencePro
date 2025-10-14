'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function UpdatePasswordPage() {
  const r = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Ensure we have a session (Supabase sets one when user clicks the email link)
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (password.length < 8) {
      setErr('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErr('Passwords do not match.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErr(error.message)
      return
    }
    setMsg('Password updated. Redirecting to sign in…')
    setTimeout(() => r.replace('/auth/sign-in'), 1200)
  }

  if (!ready) {
    return (
      <main className="max-w-md mx-auto p-6">
        <p>Checking recovery session…</p>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <button className="w-full rounded bg-black text-white py-2">Update password</button>
      </form>
    </main>
  )
}
