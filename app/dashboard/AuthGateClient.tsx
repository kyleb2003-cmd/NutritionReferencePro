'use client'

import type { ReactNode } from 'react'
import AuthGate from '@/components/AuthGate'

export default function AuthGateClient({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>
}
