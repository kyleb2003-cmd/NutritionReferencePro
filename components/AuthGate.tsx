'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

type SeatUsage = {
  used: number
  capacity: number
}

type SeatLeaseContextValue = {
  leaseId: string | null
  releaseSeat: () => Promise<void>
  seatUsage: SeatUsage | null
  workspaceId: string | null
}

const SeatLeaseContext = createContext<SeatLeaseContextValue>({
  leaseId: null,
  releaseSeat: async () => {},
  seatUsage: null,
  workspaceId: null,
})

export function useSeatLease() {
  return useContext(SeatLeaseContext)
}

async function safeRelease(leaseId: string | null) {
  if (!leaseId) return
  try {
    await supabase.rpc('release_seat', { p_lease: leaseId })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('seat_leases') || message.includes('does not exist')) {
      console.warn('release_seat failed — seat leasing objects missing', error)
    } else {
      console.warn('release_seat failed', error)
    }
  }
}

export default function AuthGate({ children }: { children: ReactNode }) {
  if (process.env.NEXT_PUBLIC_GATE_BY_SUB_STATUS === '1') {
    return (
      <SeatLeaseContext.Provider
        value={{ leaseId: null, releaseSeat: async () => {}, seatUsage: null, workspaceId: null }}
      >
        <StatusGate>{children}</StatusGate>
      </SeatLeaseContext.Provider>
    )
  }

  return <SeatLeaseProvider>{children}</SeatLeaseProvider>
}

function SeatLeaseProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [seatReady, setSeatReady] = useState(false)
  const [seatError, setSeatError] = useState<string | null>(null)
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null)
  const leaseIdRef = useRef<string | null>(null)
  const [leaseIdState, setLeaseIdState] = useState<string | null>(null)

  const releaseSeat = useCallback(async () => {
    const leaseId = leaseIdRef.current
    leaseIdRef.current = null
    setLeaseIdState(null)
    await safeRelease(leaseId)
  }, [])

  const refreshSeatUsage = useCallback(
    async (activeWorkspaceId: string | null) => {
      if (!activeWorkspaceId) {
        setSeatUsage(null)
        return
      }
      try {
        const [{ count }, { data }] = await Promise.all([
          supabase
            .from('seat_leases')
            .select('lease_id', { count: 'exact', head: true })
            .eq('workspace_id', activeWorkspaceId),
          supabase
            .from('subscriptions')
            .select('seat_count')
            .eq('clinic_id', activeWorkspaceId)
            .maybeSingle<{ seat_count: number }>(),
        ])

        if (data) {
          setSeatUsage({
            used: typeof count === 'number' ? count : 0,
            capacity: data.seat_count,
          })
        } else {
          setSeatUsage(null)
        }
      } catch (error) {
        console.warn('refreshSeatUsage failed', error)
      }
    },
    []
  )

  useEffect(() => {
    let mounted = true

    async function verifySession() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const session = data.session
      if (!session) {
        leaseIdRef.current = null
        setLeaseIdState(null)
        setSeatUsage(null)
        setSeatError(null)
        setSeatReady(false)
        setReady(false)
        setChecking(false)
        setUserId(null)
        setWorkspaceId(null)
        router.replace('/auth/sign-in')
        return
      }

      setUserId(session.user.id)
      setReady(true)
      setChecking(false)
    }

    verifySession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (!session) {
        leaseIdRef.current = null
        setLeaseIdState(null)
        setSeatUsage(null)
        setSeatError(null)
        setSeatReady(false)
        setReady(false)
        setUserId(null)
        setWorkspaceId(null)
        router.replace('/auth/sign-in')
      } else {
        setUserId(session.user.id)
        setReady(true)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    let cancelled = false

    async function syncWorkspace(forUserId: string | null) {
      if (!forUserId) {
        await Promise.resolve()
        if (!cancelled) {
          setWorkspaceId(null)
        }
        return
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('clinic_id')
          .eq('user_id', forUserId)
          .maybeSingle<{ clinic_id: string | null }>()

        if (cancelled) return

        if (profileError) {
          console.warn('Unable to fetch workspace from profile', { userId: forUserId, profileError })
        }

        const clinicId = profile?.clinic_id ?? null

        if (!clinicId) {
          console.warn('No workspace associated with user profile', { userId: forUserId })
          setSeatReady(false)
          setSeatError((prev) =>
            prev && prev !== ''
              ? prev
              : 'No workspace is linked to your account. Redirecting to workspace setup.'
          )
          setWorkspaceId(null)
          if (pathname !== '/dashboard/workspace-required') {
            router.replace('/dashboard/workspace-required')
          }
          return
        }

        setWorkspaceId(clinicId)
        setSeatError((prev) =>
          prev === 'No workspace is linked to your account. Redirecting to workspace setup.' ? null : prev
        )
        if (pathname === '/dashboard/workspace-required') {
          router.replace('/dashboard')
        }
      } catch (error) {
        if (cancelled) return
        console.warn('loadWorkspace failed', error)
        setSeatReady(false)
        setSeatError('Unable to determine your workspace. Please try again.')
        setWorkspaceId(null)
        if (pathname !== '/dashboard/workspace-required') {
          router.replace('/dashboard/workspace-required')
        }
      }
    }

    void syncWorkspace(userId)

    return () => {
      cancelled = true
    }
  }, [userId, pathname, router])

  useEffect(() => {
    let cancelled = false
    let heartbeatId: ReturnType<typeof setInterval> | null = null

    async function manageSeat(activeWorkspaceId: string | null) {
      if (!activeWorkspaceId) {
        await Promise.resolve()
        if (!cancelled) {
          setSeatReady(false)
        }
        return
      }

      await Promise.resolve()
      if (cancelled) return

      setSeatReady(false)
      setSeatError(null)
      await releaseSeat()

      const { data, error } = await supabase.rpc('claim_seat', {
        workspace_id: activeWorkspaceId,
      })

      if (cancelled) return

      if (error) {
        const { details, hint } = error as { details?: unknown; hint?: unknown }
        console.error('claim_seat failed', {
          code: error.code,
          message: error.message,
          details,
          hint,
        })
        const message = error.message || ''
        if (error.code === '42P01' || /relation "public\.seat_leases"/i.test(message) || message.includes('does not exist')) {
          setSeatError('Seat claim failed. Apply the latest Supabase migration that creates public.seat_leases and try again.')
        } else if (error.code === '23514' || /no seats available/i.test(message)) {
          setSeatError('All seats are in use for your plan.')
        } else {
          setSeatError(message || 'Unable to reserve a seat. Please try again.')
        }
        return
      }

      const leaseRow = Array.isArray(data) ? data[0] : data
      const leaseId = leaseRow?.lease_id as string | undefined

      if (!leaseId) {
        setSeatError('Seat claim succeeded without a lease id. Please try again.')
        return
      }

      leaseIdRef.current = leaseId
      setLeaseIdState(leaseId)
      setSeatReady(true)
      await refreshSeatUsage(activeWorkspaceId)

      heartbeatId = setInterval(async () => {
        const activeLease = leaseIdRef.current
        if (!activeLease) return
        const { error: heartbeatError } = await supabase.rpc('heartbeat', { p_lease: activeLease })
        if (heartbeatError) {
          console.warn('heartbeat failed', heartbeatError)
          return
        }
        await refreshSeatUsage(activeWorkspaceId)
      }, 60_000)
    }

    void manageSeat(workspaceId)

    const handleBeforeUnload = () => {
      if (!leaseIdRef.current) return
      void supabase.rpc('release_seat', { p_lease: leaseIdRef.current })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      cancelled = true
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (heartbeatId) clearInterval(heartbeatId)
      void releaseSeat()
    }
  }, [workspaceId, refreshSeatUsage, releaseSeat])

  const contextValue = useMemo(
    () => ({
      leaseId: leaseIdState,
      releaseSeat,
      seatUsage,
      workspaceId,
    }),
    [leaseIdState, releaseSeat, seatUsage, workspaceId]
  )

  if (pathname === '/dashboard/workspace-required') {
    return <SeatLeaseContext.Provider value={contextValue}>{children}</SeatLeaseContext.Provider>
  }

  if (!ready) {
    return checking ? <div className="text-sm text-gray-700">Checking session…</div> : null
  }

  if (seatError) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-900">
        <p className="text-lg font-semibold">{seatError}</p>
        <button
          type="button"
          onClick={async () => {
            await releaseSeat()
            await supabase.auth.signOut({ scope: 'global' })
            router.replace('/auth/sign-in')
          }}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90"
        >
          Return to sign-in
        </button>
      </div>
    )
  }

  if (!seatReady) {
    return <div className="text-sm text-gray-700">Securing a seat for your session…</div>
  }

  return <SeatLeaseContext.Provider value={contextValue}>{children}</SeatLeaseContext.Provider>
}

function StatusGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'allowed' | 'blocked'>('checking')
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function verify() {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const session = data.session
      if (!session) {
        router.replace('/auth/sign-in')
        return
      }

      try {
        const res = await fetch('/api/gate', { credentials: 'include' })
        const json = await res.json()
        if (!active) return
        if (res.ok && json.ok) {
          setState('allowed')
          setReason(null)
        } else {
          setState('blocked')
          setReason(json.reason ?? 'subscription_required')
        }
      } catch {
        if (!active) return
        setState('blocked')
        setReason('request_failed')
      }
    }

    verify()
    return () => {
      active = false
    }
  }, [router])

  if (state === 'checking') {
    return <div className="text-sm text-gray-700">Checking subscription…</div>
  }

  if (state === 'blocked') {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Subscription required</h2>
        <p className="mt-2 text-sm text-gray-700">
          {reason === 'missing_subscription'
            ? 'We could not find an active subscription for your clinic.'
            : reason === 'no_clinic'
              ? 'Please complete sign-up to create a clinic.'
              : reason === 'request_failed'
                ? 'Unable to verify subscription. Try again in a moment.'
                : 'Your subscription is pending activation.'}
        </p>
        <div className="mt-4 flex justify-center gap-3 text-sm">
          <a className="rounded bg-black px-4 py-2 font-semibold text-white" href="/sign-up">
            Subscribe
          </a>
          <a className="rounded border px-4 py-2" href="/dashboard/billing">
            Manage billing
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
