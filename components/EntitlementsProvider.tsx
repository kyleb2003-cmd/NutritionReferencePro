'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase-client'

type EntitlementsState = {
  status: 'loading' | 'ready' | 'error'
  canExportHandouts: boolean
  canAccessBranding: boolean
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  workspaceId: string | null
  leaseRecent: boolean | null
  hasMembership: boolean
}

type EntitlementsContextValue = EntitlementsState & {
  refreshEntitlements: () => Promise<EntitlementsState>
}

const defaultState: EntitlementsState = {
  status: 'loading',
  canExportHandouts: false,
  canAccessBranding: false,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  workspaceId: null,
  leaseRecent: null,
  hasMembership: false,
}

const EntitlementsContext = createContext<EntitlementsContextValue>({
  ...defaultState,
  refreshEntitlements: async () => defaultState,
})

export function useEntitlements() {
  return useContext(EntitlementsContext)
}

export function EntitlementsProvider({
  workspaceId,
  children,
}: {
  workspaceId: string | null
  children: ReactNode
}) {
  const [state, setState] = useState<EntitlementsState>({ ...defaultState })
  const loadingRef = useRef(false)
  const loggedOnceRef = useRef(false)

  const fetchEntitlements = useCallback(async (): Promise<EntitlementsState> => {
    if (!workspaceId) {
      const emptyState: EntitlementsState = {
        status: 'loading',
        canExportHandouts: false,
        canAccessBranding: false,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      workspaceId: null,
      leaseRecent: null,
      hasMembership: false,
      }
      console.info('[entitlements.fetch]', {
        workspaceId,
        resolved: false,
        reason: 'missing_workspace',
      })
      setState(emptyState)
      loadingRef.current = false
      return emptyState
    }

    loadingRef.current = true
    setState((prev) => ({ ...prev, status: 'loading' }))

    const { data, error } = await supabase.rpc('get_entitlements')

    if (error) {
      console.warn('[entitlements.fetch] failed', { workspaceId, error })
      const failedState: EntitlementsState = {
        status: 'error',
        canExportHandouts: false,
        canAccessBranding: false,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        workspaceId,
        leaseRecent: null,
        hasMembership: true,
      }
      setState(failedState)
      loadingRef.current = false
      return failedState
    }

    const nextState: EntitlementsState = {
      status: 'ready',
      canExportHandouts: Boolean(data?.can_export_handouts),
      canAccessBranding: Boolean(data?.can_access_branding),
      subscriptionStatus: (data?.subscription_status as string | null) ?? null,
      currentPeriodEnd: (data?.current_period_end as string | null) ?? null,
      workspaceId: (data?.workspace_id as string | null) ?? workspaceId,
      leaseRecent: typeof data?.lease_recent === 'boolean' ? data.lease_recent : null,
      hasMembership: Boolean(data?.has_membership),
    }

    console.info('[entitlements.fetch(normalized)]', {
      workspaceId: nextState.workspaceId,
      subscriptionStatus: nextState.subscriptionStatus,
      canExportHandouts: nextState.canExportHandouts,
      leaseRecent: nextState.leaseRecent,
    })

    setState(nextState)
    loadingRef.current = false
    return nextState
  }, [workspaceId])

  useEffect(() => {
    let active = true
    async function ensureFetched() {
      if (loadingRef.current) return
      if (!active) return
      await fetchEntitlements()
    }

    void ensureFetched()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        void fetchEntitlements()
      }
    })

    // Refresh when tab becomes visible again (e.g., return from billing portal)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchEntitlements()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      active = false
      authListener.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchEntitlements])

  // One-time normalized dump when ready (diagnostic; safe to remove later)
  useEffect(() => {
    if (state.status === 'ready' && !loggedOnceRef.current) {
      loggedOnceRef.current = true
      console.info('[entitlements.ready]', {
        canExportHandouts: state.canExportHandouts,
        canAccessBranding: state.canAccessBranding,
        subscriptionStatus: state.subscriptionStatus,
        currentPeriodEnd: state.currentPeriodEnd,
        leaseRecent: state.leaseRecent,
        workspaceId: state.workspaceId,
      })
    }
  }, [state])

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      ...state,
      refreshEntitlements: fetchEntitlements,
    }),
    [state, fetchEntitlements]
  )

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
}
