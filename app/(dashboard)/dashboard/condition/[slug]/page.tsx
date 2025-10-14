'use client'

import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import HandoutPDF, { type PDFSection } from '@/components/pdf/HandoutPDF'
import HandoutPreviewModal from '@/components/pdf/HandoutPreviewModal'
import { supabase } from '@/lib/supabase-client'
import { blobToDataUrl, downloadPdf } from '@/lib/pdf'

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
  const [patientError, setPatientError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<ReactElement<DocumentProps> | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('handout.pdf')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

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

  async function getBranding() {
    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user?.id
    if (!uid) {
      return { clinicName: '', footerText: '', logoDataUrl: null as string | null }
    }

    const { data } = await supabase
      .from('clinics')
      .select('clinic_name, footer_text, logo_path')
      .eq('id', uid)
      .maybeSingle()

    let logoDataUrl: string | null = null
    if (data?.logo_path) {
      const result = await supabase.storage.from('branding').download(data.logo_path)
      if (!result.error && result.data) {
        logoDataUrl = await blobToDataUrl(result.data)
      }
    }

    return {
      clinicName: data?.clinic_name || '',
      footerText: data?.footer_text || '',
      logoDataUrl,
    }
  }

  function buildSections(content: Content | null | undefined, selections: SelectedSections): PDFSection[] {
    if (!content) return []
    const sections: PDFSection[] = []
    const push = (key: keyof Content, label: string) => {
      if (selections[key]) {
        sections.push({ label, text: content[key] || '' })
      }
    }
    push('overview', 'Overview')
    push('mealplan_1400', 'Meal Plan 1400 kcal')
    push('mealplan_1800', 'Meal Plan 1800 kcal')
    push('mealplan_2200', 'Meal Plan 2200 kcal')
    push('mealplan_2600', 'Meal Plan 2600 kcal')
    push('shopping_list', 'Shopping List')
    push('rd_referral', 'RD Referral')
    return sections
  }

  async function onPreviewPdf() {
    if (!condition) return
    if (!patientName.trim()) {
      setPatientError('Patient name is required to generate the handout.')
      return
    }
    setPatientError(null)
    setExporting(true)
    try {
      const branding = await getBranding()
      const printedOn = new Date().toLocaleDateString()
      const sections = buildSections(condition.content ?? null, selected)

      const doc = (
        <HandoutPDF
          clinicName={branding.clinicName}
          footerText={branding.footerText}
          logoDataUrl={branding.logoDataUrl}
          conditionName={condition.name}
          patientName={patientName.trim()}
          printedOn={printedOn}
          sections={sections}
        />
      ) as ReactElement<DocumentProps>

      const safeSlug = (condition.slug || 'handout').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
      setPreviewFilename(`${safeSlug}-handout.pdf`)
      setPreviewDoc(doc)
      setPreviewOpen(true)
    } catch (exportError) {
      console.error('PDF export failed:', exportError)
      alert('Oops, something went wrong preparing the PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function onDownloadPdf() {
    if (!previewDoc) return
    setDownloading(true)
    try {
      await downloadPdf(previewDoc, previewFilename)
    } catch (downloadError) {
      console.error('PDF download failed:', downloadError)
      alert('Unable to download the PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="space-y-4 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{condition?.name ?? 'Loading condition...'}</h2>
          <p className="text-gray-800">
            Use the Handout Builder on the right to pick sections and export a PDF branded for your clinic.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {loading && !condition && <p className="text-sm text-gray-700">Loading condition content…</p>}

        {condition?.content?.overview && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Overview preview</h3>
            <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
              {condition.content.overview}
            </pre>
          </div>
        )}
      </div>

      <aside className="hidden xl:block xl:col-start-3 xl:row-start-1">
        <div className="sticky top-24 space-y-4 rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="font-medium">Handout Builder</h3>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">
              <span>Patient name</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
                value={patientName}
                onChange={(event) => {
                  const value = event.target.value
                  setPatientName(value)
                  if (value.trim()) {
                    setPatientError(null)
                  }
                }}
                placeholder="e.g., Jane Smith"
              />
              {patientError ? <p className="mt-1 text-xs text-red-600">{patientError}</p> : null}
            </label>
            <div className="space-y-2 border-t border-gray-200 pt-2 text-sm">
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
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60"
            onClick={onPreviewPdf}
            disabled={loading || !condition || exporting || !patientName.trim()}
          >
            {exporting ? 'Preparing…' : 'Preview PDF'}
          </button>
          <p className="text-xs text-gray-700">
            Your clinic logo and footer will appear automatically when you export the PDF.
          </p>
        </div>
      </aside>

      <HandoutPreviewModal
        open={previewOpen}
        document={previewDoc}
        filename={previewFilename}
        onClose={() => setPreviewOpen(false)}
        onDownload={onDownloadPdf}
        downloading={downloading}
      />
    </>
  )
}
