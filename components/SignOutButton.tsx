'use client'
import { useState } from 'react'
import { useSeatLease } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-client'

export default function SignOutButton() {
  const [busy, setBusy] = useState(false)
  const { releaseSeat } = useSeatLease()
  return (
    <button
      type="button"
      aria-label="Sign out"
      className="inline-flex cursor-pointer items-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-600"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true)
          await releaseSeat()
          const { error } = await supabase.auth.signOut({ scope: 'global' })
          if (error) {
            console.error('Sign out error:', error)
          }
          // Go straight to confirmation page before landing redirect.
          window.location.replace('/auth/sign-out')
        } catch (e) {
          console.error('Sign out exception:', e)
          window.location.replace('/auth/sign-out')
        }
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
