import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Homepage', () => {
  it('renders marketing headline and CTA links', () => {
    render(<Home />)
    expect(screen.getAllByText(/nutrition reference pro/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0)
  })
})
