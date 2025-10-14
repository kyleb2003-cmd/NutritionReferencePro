'use client'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutButton() {
  const r = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      aria-label="Sign out"
      className="rounded bg-gray-200 hover:bg-gray-300 px-3 py-1 text-sm transition disabled:opacity-60"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true)
          const { error } = await supabase.auth.signOut({ scope: 'global' })
          if (error) {
            console.error('Sign out error:', error)
          }
          r.replace('/auth/sign-out')
        } catch (e) {
          console.error('Sign out exception:', e)
          r.replace('/auth/sign-out')
        }
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
