
'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

type GroupRow = { id: number; name: string; slug: string }
type ConditionRow = { id: number; name: string; slug: string; group_id: number }

type JoinedGroup = GroupRow & { conditions: ConditionRow[] }
type FlatCondition = ConditionRow & { groupId: number }

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(handle)
  }, [value, delay])
  return debounced
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text
  const regex = new RegExp(escapeRegExp(query), 'ig')
  const parts = text.split(regex)
  const matches = text.match(regex)
  if (!matches) return text
  const result: ReactNode[] = []
  parts.forEach((part, index) => {
    result.push(part)
    if (matches[index]) {
      result.push(
        <mark key={`${matches[index]}-${index}`} className="rounded-sm bg-yellow-200 px-0.5">
          {matches[index]}
        </mark>,
      )
    }
  })
  return result
}

export default function ConditionsList() {
  const pathname = usePathname()
  const router = useRouter()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [conditions, setConditions] = useState<ConditionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const debouncedQuery = useDebouncedValue(q, 300)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const listboxId = 'conditions-listbox'

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
    const needle = debouncedQuery.trim().toLowerCase()
    if (!needle) return joined
    return joined
      .map((group) => ({
        ...group,
        conditions: group.conditions.filter(
          (cond) => cond.name.toLowerCase().includes(needle) || cond.slug.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.conditions.length > 0)
  }, [joined, debouncedQuery])

  const flat = useMemo<FlatCondition[]>(() => {
    return filtered.flatMap((group) =>
      group.conditions.map((condition) => ({ ...condition, groupId: group.id })),
    )
  }, [filtered])

  const indexById = useMemo(() => {
    const map = new Map<number, number>()
    flat.forEach((item, idx) => map.set(item.id, idx))
    return map
  }, [flat])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [debouncedQuery])

  useEffect(() => {
    if (focusedIndex >= flat.length) {
      setFocusedIndex(flat.length ? flat.length - 1 : -1)
    }
  }, [flat.length, focusedIndex])

  useEffect(() => {
    if (focusedIndex < 0) return
    const node = itemRefs.current[focusedIndex]
    if (node) {
      node.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!flat.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusedIndex((prev) => {
        const next = prev + 1
        return next >= flat.length ? 0 : next
      })
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setFocusedIndex((prev) => {
        const next = prev - 1
        return next < 0 ? flat.length - 1 : next
      })
    } else if (event.key === 'Enter') {
      if (focusedIndex >= 0 && flat[focusedIndex]) {
        event.preventDefault()
        router.push(`/dashboard/condition/${flat[focusedIndex].slug}`)
      }
    }
  }

  const activeDescendant = focusedIndex >= 0 && flat[focusedIndex]
    ? `condition-option-${flat[focusedIndex].id}`
    : undefined

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
          onKeyDown={handleSearchKeyDown}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
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
        <nav id={listboxId} role="listbox" className="space-y-5">
          {filtered.map((group) => (
            <div key={group.id}>
              <div className="sticky top-16 z-10 mb-2 bg-white pb-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                {highlightMatch(group.name, debouncedQuery)}
              </div>
              <ul className="space-y-1">
                {group.conditions.map((cond) => {
                  const href = `/dashboard/condition/${cond.slug}`
                  const isActive = pathname?.startsWith(href)
                  const flatIndex = indexById.get(cond.id) ?? -1
                  const isFocused = flatIndex === focusedIndex
                  return (
                    <li key={cond.id}>
                      <a
                        id={`condition-option-${cond.id}`}
                        ref={(node) => {
                          if (flatIndex >= 0) itemRefs.current[flatIndex] = node
                        }}
                        href={href}
                        role="option"
                        aria-selected={isActive || isFocused}
                        tabIndex={-1}
                        className={`block cursor-pointer rounded px-2 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 ${
                          isActive
                            ? 'bg-gray-900 text-white'
                            : isFocused
                            ? 'bg-gray-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {highlightMatch(cond.name, debouncedQuery)}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-700">No matches. Try a different keyword.</p>
          )}
        </nav>
      )}
    </div>
  )
}
