import type { ReactNode } from 'react'
import Link from 'next/link'
import AuthGateClient from './AuthGateClient'
import ConditionsList from '@/components/ConditionsList'
import SignOutButton from '@/components/SignOutButton'
import SeatUsageBanner from '@/components/SeatUsageBanner'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-lg font-semibold text-gray-900 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            >
              Nutrition Reference Pro
            </Link>
            <nav className="hidden items-center gap-5 text-sm font-medium text-gray-800 md:flex">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-md px-2 py-1 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/branding"
                className="inline-flex items-center rounded-md px-2 py-1 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
              >
                Branding
              </Link>
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <AuthGateClient>
          <SeatUsageBanner />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_360px]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <ConditionsList />
            </aside>
            <div className="contents">{children}</div>
          </div>
        </AuthGateClient>
      </div>
    </div>
  )
}
