'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

type Condition = { id: number; name: string; slug: string }
type Group = { id: number; name: string; slug: string; conditions?: Condition[] }

type GroupPayload = {
  id: number
  name: string
  slug: string
  conditions: Condition[]
}

export default function ConditionsList() {
  const pathname = usePathname()
  const [groups, setGroups] = useState<Group[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id,name,slug,conditions:conditions ( id,name,slug )')
        .order('name', { ascending: true })
      if (!active) return
      if (error) {
        console.error('Failed to load conditions', error)
        return
      }
      setGroups(((data as GroupPayload[]) || []).map((group) => ({ ...group })))
    })()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        conditions: (group.conditions || []).filter(
          (cond) => cond.name.toLowerCase().includes(needle) || cond.slug.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => (group.conditions || []).length > 0)
  }, [groups, q])

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
      <nav className="space-y-5">
        {filtered.map((group) => (
          <div key={group.id}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">{group.name}</div>
            <ul className="space-y-1">
              {(group.conditions || []).map((cond) => {
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
    </div>
  )
}
