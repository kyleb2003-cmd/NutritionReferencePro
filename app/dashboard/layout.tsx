import type { ReactNode } from 'react'
import AuthGateClient from './AuthGateClient'
import ConditionsList from '@/components/ConditionsList'
import SeatUsageBanner from '@/components/SeatUsageBanner'
import AppShellHeader from '@/components/AppShellHeader'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppShellHeader active="dashboard" />
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
