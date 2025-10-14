'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import SignOutButton from '@/components/SignOutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const r = useRouter()

  useEffect(() => {
    let mounted = true
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session && mounted) r.replace('/auth/sign-in')
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange(() => check())
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [r])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold">Nutrition Reference Pro</h1>
          <nav className="text-sm text-gray-600">
            <a className="hover:underline" href="/dashboard/branding">
              Branding
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <a href="/auth/sign-out" className="text-sm underline text-gray-600 hover:text-gray-900">
            Sign out
          </a>
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  )
}
