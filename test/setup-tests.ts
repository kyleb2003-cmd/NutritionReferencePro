import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Provide React globally for environments that expect it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).React = React

vi.mock('next/navigation', () => {
  const push = vi.fn(), replace = vi.fn(), back = vi.fn()
  return {
    useRouter: () => ({ push, replace, back }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
  }
})

vi.mock('@/lib/supabase-client', () => {
  const onAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange,
      },
      from: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      storage: {
        from: vi.fn(() => ({ download: vi.fn().mockResolvedValue({ data: null, error: null }) })),
      },
    },
  }
})
