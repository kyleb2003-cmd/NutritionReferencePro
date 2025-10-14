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
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="text-lg font-semibold">
              Nutrition Reference Pro
            </a>
            <nav className="hidden items-center gap-5 text-sm text-gray-600 md:flex">
              <a className="hover:underline" href="/dashboard">
                Dashboard
              </a>
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
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</div>
    </div>
  )
}
