'use client'

import { useSeatLease } from '@/components/AuthGate'

export default function SeatUsageBanner() {
  const { seatUsage } = useSeatLease()
  if (!seatUsage) return null
  if (seatUsage.capacity <= 0) return null

  return (
    <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700">
      Seats in use: {seatUsage.used} of {seatUsage.capacity}
    </div>
  )
}
