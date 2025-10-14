'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function SignInPage() {
  const r = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    r.replace('/dashboard') // go to protected app
  }

  return (
    <main className="mx-auto max-w-md space-y-5 px-6 py-8 text-gray-900">
      <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus-visible:border-gray-500"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus-visible:border-gray-500"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          className="w-full cursor-pointer rounded-md bg-black py-2 text-sm font-semibold text-white transition hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-600"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="flex flex-wrap gap-3 text-sm font-medium text-gray-800">
        <a href="/auth/forgot-password" className="underline decoration-2">
          Forgot password?
        </a>
        <a href="/auth/sign-up" className="underline decoration-2">
          Create account
        </a>
      </div>
    </main>
  )
}
