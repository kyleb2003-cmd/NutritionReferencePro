import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ConditionsList from '@/components/ConditionsList'
import { supabase } from '@/lib/supabase-client'

describe('ConditionsList', () => {
  it('filters conditions by search (debounced)', async () => {
    const fromMock = vi.spyOn(supabase, 'from' as never)

    fromMock.mockImplementation((table: string) => {
      if (table === 'groups') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, name: 'Digestive', slug: 'digestive' }],
              error: null,
            }),
          }),
        } as never
      }
      if (table === 'conditions') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 10, name: 'Irritable Bowel Syndrome (IBS)', slug: 'ibs', group_id: 1 }],
              error: null,
            }),
          }),
        } as never
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as never
    })

    render(<ConditionsList />)
    const input = screen.getByPlaceholderText(/search conditions/i)
    await userEvent.type(input, 'ibs')
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(await screen.findByText(/irritable bowel syndrome/i)).toBeInTheDocument()

    fromMock.mockRestore()
  })
})
