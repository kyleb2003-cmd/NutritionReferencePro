'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function SignOutPage() {
  const r = useRouter()
  const [message, setMessage] = useState('Signing you out…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let redirectTimer: ReturnType<typeof setTimeout> | undefined

    ;(async () => {
      try {
        const { error } = await supabase.auth.signOut({ scope: 'global' })
        if (error) throw error
        if (!active) return
        setMessage('You’ve been signed out.')
        // Redirect after 1.5 seconds
        redirectTimer = setTimeout(() => {
          r.replace('/')
        }, 1500)
      } catch (err) {
        if (!active) return
        const message =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Sign-out failed'
        setError(message)
      }
    })()

    return () => {
      active = false
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [r])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-white to-slate-50">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Nutrition Reference Pro</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-gray-800">{message}</p>}
        <p className="text-sm text-gray-700">Redirecting to the home page…</p>
      </div>
    </main>
  )
}
