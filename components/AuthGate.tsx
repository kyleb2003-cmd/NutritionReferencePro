'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    async function verifySession() {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      if (!mounted) return

      if (!session) {
        setReady(false)
        setChecking(false)
        router.replace('/auth/sign-in')
        return
      }

      setReady(true)
      setChecking(false)
    }

    verifySession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (!session) {
        setReady(false)
        router.replace('/auth/sign-in')
      } else {
        setReady(true)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  if (!ready) {
    return checking ? (
      <div className="text-sm text-gray-700">Checking session…</div>
    ) : null
  }

  return <>{children}</>
}
