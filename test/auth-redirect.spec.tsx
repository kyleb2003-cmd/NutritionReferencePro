import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import DashboardLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

describe('Dashboard auth redirect', () => {
  it('redirects to /auth/sign-in when no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null } } as any)
    const router = useRouter() as any
    render(
      <DashboardLayout>
        <div>child</div>
      </DashboardLayout>,
    )
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/auth/sign-in')
    })
  })
})
