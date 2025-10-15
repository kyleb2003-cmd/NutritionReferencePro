'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

type GroupRow = { id: number; name: string; slug: string }
type ConditionRow = { id: number; name: string; slug: string; group_id: number }

type JoinedGroup = GroupRow & { conditions: ConditionRow[] }

export default function ConditionsList() {
  const pathname = usePathname()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [conditions, setConditions] = useState<ConditionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const session = await supabase.auth.getSession()
        if (!session.data.session) {
          console.warn('ConditionsList: no active session, skipping fetch.')
        }

        const [groupsRes, conditionsRes] = await Promise.all([
          supabase.from('groups').select('id,name,slug').order('name', { ascending: true }),
          supabase.from('conditions').select('id,name,slug,group_id').order('name', { ascending: true }),
        ])

        if (!active) return

        if (groupsRes.error) {
          console.error('Failed to load groups', groupsRes.error)
          setError('Unable to load condition groups.')
          return
        }

        if (conditionsRes.error) {
          console.error('Failed to load conditions', conditionsRes.error)
          setError('Unable to load conditions.')
          return
        }

        const groupRows = (groupsRes.data as GroupRow[]) || []
        const conditionRows = (conditionsRes.data as ConditionRow[]) || []

        console.debug('ConditionsList fetched', {
          groupsCount: groupRows.length,
          conditionsCount: conditionRows.length,
        })

        setGroups(groupRows)
        setConditions(conditionRows)
      } catch (err) {
        console.error('Unexpected error loading conditions', err)
        if (active) setError('Unexpected error loading conditions.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const joined = useMemo<JoinedGroup[]>(() => {
    if (!groups.length) return []
    return groups.map((group) => ({
      ...group,
      conditions: conditions.filter((cond) => cond.group_id === group.id),
    }))
  }, [groups, conditions])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return joined
    return joined
      .map((group) => ({
        ...group,
        conditions: group.conditions.filter(
          (cond) => cond.name.toLowerCase().includes(needle) || cond.slug.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.conditions.length > 0)
  }, [joined, q])

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium" htmlFor="condition-search">
          Conditions
        </label>
        <input
          id="condition-search"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          placeholder="Search conditions..."
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2 text-sm text-gray-700">
          <p>Loading conditions…</p>
          <div className="h-3 rounded bg-gray-200" />
          <div className="h-3 w-5/6 rounded bg-gray-200" />
          <div className="h-3 w-4/6 rounded bg-gray-200" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">Couldn&apos;t load conditions.</div>
      ) : (
        <nav className="space-y-5">
          {filtered.map((group) => (
            <div key={group.id}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">{group.name}</div>
              <ul className="space-y-1">
                {group.conditions.map((cond) => {
                  const href = `/dashboard/condition/${cond.slug}`
                  const isActive = pathname?.startsWith(href)
                  return (
                    <li key={cond.id}>
                      <a
                        href={href}
                        className={`block rounded px-2 py-1 text-sm transition ${
                          isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                        }`}
                      >
                        {cond.name}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-gray-700">No matches.</p>}
        </nav>
      )}
    </div>
  )
}
