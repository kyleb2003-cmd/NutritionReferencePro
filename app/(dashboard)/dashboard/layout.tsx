import type { ReactNode } from 'react'
import AuthGate from '@/components/AuthGate'
import ConditionsList from '@/components/ConditionsList'

export default function DashboardThreeColLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ConditionsList />
        </aside>
        <div className="contents">{children}</div>
      </div>
    </AuthGate>
  )
}
