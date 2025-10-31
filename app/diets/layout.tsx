import type { ReactNode } from 'react'
import AuthGateClient from '../dashboard/AuthGateClient'
import AppShellHeader from '@/components/AppShellHeader'
import SeatUsageBanner from '@/components/SeatUsageBanner'

export default function DietsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppShellHeader active="diets" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <AuthGateClient>
          <SeatUsageBanner />
          <div className="min-h-[60vh]">{children}</div>
        </AuthGateClient>
      </div>
    </div>
  )
}
