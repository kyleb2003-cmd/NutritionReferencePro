'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

type Content = {
  overview?: string | null
  mealplan_1400?: string | null
  mealplan_1800?: string | null
  mealplan_2200?: string | null
  mealplan_2600?: string | null
  shopping_list?: string | null
  rd_referral?: string | null
}

type ConditionRow = {
  id: number
  name: string
  slug: string
  content?: Content | null
}

type SelectedSections = Record<string, boolean>

type Params = {
  slug: string
}

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'mealplan_1400', label: 'Meal Plan 1400 kcal' },
  { key: 'mealplan_1800', label: 'Meal Plan 1800 kcal' },
  { key: 'mealplan_2200', label: 'Meal Plan 2200 kcal' },
  { key: 'mealplan_2600', label: 'Meal Plan 2600 kcal' },
  { key: 'shopping_list', label: 'Shopping List' },
  { key: 'rd_referral', label: 'RD Referral' },
] as const

export default function ConditionBuilderPage() {
  const params = useParams<Params>()
  const slug = params?.slug
  const [condition, setCondition] = useState<ConditionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SelectedSections>(() => ({ overview: true, shopping_list: true }))
  const [patientName, setPatientName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    ;(async () => {
      const { data, error } = await supabase
        .from('conditions')
        .select(
          'id,name,slug,content:condition_content ( overview,mealplan_1400,mealplan_1800,mealplan_2200,mealplan_2600,shopping_list,rd_referral )',
        )
        .eq('slug', slug)
        .maybeSingle()

      if (!active) return

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (!data) {
        setCondition(null)
        setError('Condition not found')
      } else {
        setCondition(data as ConditionRow)
      }
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [slug])

  const sectionOptions = useMemo(() => SECTIONS, [])

  return (
    <>
      <div className="space-y-4 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{condition?.name ?? 'Loading condition...'}</h2>
          <p className="text-gray-700">
            Use the Handout Builder on the right to pick sections and export a PDF branded for your clinic.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {loading && !condition && <p className="text-sm text-gray-500">Loading condition content…</p>}

        {condition?.content?.overview && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Overview preview</h3>
            <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm text-gray-800">
              {condition.content.overview}
            </pre>
          </div>
        )}
      </div>

      <aside className="hidden xl:block xl:col-start-3 xl:row-start-1">
        <div className="sticky top-24 space-y-4 rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="font-medium">Handout Builder</h3>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-gray-600">Patient name (optional)</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="e.g., Jane Smith"
              />
            </label>
            <div className="space-y-2 border-t pt-2 text-sm">
              {sectionOptions.map((section) => (
                <label key={section.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!selected[section.key]}
                    onChange={(event) =>
                      setSelected((prev) => ({ ...prev, [section.key]: event.target.checked }))
                    }
                  />
                  {section.label}
                </label>
              ))}
            </div>
          </div>
          <button
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90"
            onClick={() => alert('Export to PDF coming soon')}
            disabled={loading || !condition}
          >
            Export PDF
          </button>
          <p className="text-xs text-gray-500">
            Your clinic logo and footer will appear automatically when you export the PDF.
          </p>
        </div>
      </aside>
    </>
  )
}
