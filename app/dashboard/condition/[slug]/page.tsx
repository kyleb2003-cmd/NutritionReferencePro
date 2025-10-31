'use client'

import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import HandoutPDF, { type PDFSection } from '@/components/pdf/HandoutPDF'
import HandoutPreviewModal from '@/components/pdf/HandoutPreviewModal'
import { supabase } from '@/lib/supabase-client'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { blobToDataUrl, openPdfInNewTab } from '@/lib/pdf'
import { useSeatLease } from '@/components/AuthGate'
import { useEntitlements } from '@/components/EntitlementsProvider'

type Content = {
  overview?: string | null
  mealplan_1400?: string | null
  mealplan_1800?: string | null
  mealplan_2200?: string | null
  mealplan_2600?: string | null
  shopping_list?: string | null
  rd_referral?: string | null
  practitioner_notes?: string | null
  eat_this_not_that?: string | null
}

type ConditionRow = {
  id: number
  name: string
  slug: string
  content?: Content | null
  citations?: Citation[]
}

type Citation = {
  id: number
  citation: string
  url: string | null
  sort_order: number | null
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
  { key: 'eat_this_not_that', label: 'Eat This, not That' },
] as const

export default function ConditionBuilderPage() {
  const params = useParams<Params>()
  const slug = params?.slug
  const { workspaceId } = useSeatLease()
  const {
    status: entitlementsStatus,
    canExportHandouts,
    canAccessBranding,
    refreshEntitlements,
  } = useEntitlements()
  const [condition, setCondition] = useState<ConditionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SelectedSections>(() => ({
    overview: true,
    mealplan_1400: false,
    mealplan_1800: false,
    mealplan_2200: false,
    mealplan_2600: false,
    shopping_list: false,
    rd_referral: false,
    eat_this_not_that: false,
  }))
  const [patientName, setPatientName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [patientError, setPatientError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<ReactElement<DocumentProps> | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('handout.pdf')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [subscribeBusy, setSubscribeBusy] = useState(false)

  useEffect(() => {
    console.info('[entitlements.condition]', {
      status: entitlementsStatus,
      canExportHandouts,
      canAccessBranding,
      workspaceId,
    })
  }, [entitlementsStatus, canExportHandouts, canAccessBranding, workspaceId])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    ;(async () => {
      const { data, error } = await supabase
        .from('conditions')
        .select(
          'id,name,slug,content:condition_content ( practitioner_notes,overview,mealplan_1400,mealplan_1800,mealplan_2200,mealplan_2600,shopping_list,rd_referral,eat_this_not_that ),citations:condition_citations ( id,citation,url,sort_order )',
        )
        .eq('slug', slug)
        .order('sort_order', { referencedTable: 'condition_citations', ascending: true })
        .order('id', { referencedTable: 'condition_citations', ascending: true })
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
    if (!workspaceId || !canAccessBranding) {
      return { clinicName: '', footerText: '', logoDataUrl: null as string | null }
    }

    const { data } = await supabase
      .from('clinics')
      .select('clinic_name, footer_text, logo_path')
      .eq('id', workspaceId)
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
    const placeholder = '[Placeholder] Content will go here.'
    const sections: PDFSection[] = []
    const push = (key: keyof Content, label: string) => {
      if (!selections[key]) return
      const raw = content[key] ?? ''
      const text = typeof raw === 'string' ? raw : ''
      const normalized = text.replace(/\r\n/g, '\n').trim()
      sections.push({ label, text: normalized.length > 0 ? raw : placeholder })
    }
    push('overview', 'Overview')
    push('mealplan_1400', 'Meal Plan 1400 kcal')
    push('mealplan_1800', 'Meal Plan 1800 kcal')
    push('mealplan_2200', 'Meal Plan 2200 kcal')
    push('mealplan_2600', 'Meal Plan 2600 kcal')
    push('shopping_list', 'Shopping List')
    push('rd_referral', 'RD Referral')
    push('eat_this_not_that', 'Eat This, not That')
    return sections
  }

  async function onPreviewPdf() {
    if (!condition) return
    if (!patientName.trim()) {
      setPatientError('Patient name is required to generate the handout.')
      return
    }
    if (!canExportHandouts) {
      const refreshed = await refreshEntitlements()
      if (!refreshed.canExportHandouts) {
        setSubscriptionError('An active subscription is required to preview handouts.')
        return
      }
    }
    setPatientError(null)
    setSubscriptionError(null)
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

  async function onOpenPdf() {
    if (!condition) return
    if (!canExportHandouts) {
      const refreshed = await refreshEntitlements()
      if (!refreshed.canExportHandouts) {
        setSubscriptionError('An active subscription is required to preview handouts.')
        return
      }
    }
    setOpening(true)
    try {
      const branding = await getBranding()
      const printedOn = new Date().toLocaleDateString()
      const sections = buildSections(condition.content ?? null, selected)
      const safeSlug = (condition.slug || 'handout').replace(/[^a-z0-9-]/gi, '-').toLowerCase()

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

      await openPdfInNewTab(doc, previewFilename || `${safeSlug}-handout.pdf`)
    } catch (downloadError) {
      console.error('PDF download failed:', downloadError)
      alert('Unable to download the PDF. Please try again.')
    } finally {
      setOpening(false)
    }
  }

  async function onSubscribe() {
    setSubscriptionError(null)
    setSubscribeBusy(true)
    try {
      const response = await fetchWithAuth('/api/billing/checkout', { method: 'POST' })
      const payload = (await response.json()) as { url?: string }
      if (payload?.url) {
        window.location.href = payload.url
        return
      }
      throw new Error('Stripe checkout URL missing.')
    } catch (subscribeErr) {
      const message = subscribeErr instanceof Error ? subscribeErr.message : String(subscribeErr)
      setSubscriptionError(message)
    } finally {
      setSubscribeBusy(false)
      void refreshEntitlements()
    }
  }

  const subscriptionGatePanel = (
    <div className="space-y-3 rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Subscribe to export handouts</h3>
        <p className="text-sm text-gray-700">
          An active plan unlocks the PDF preview and clinic branding for handouts.
        </p>
      </div>
      {!workspaceId ? (
        <p className="text-sm text-amber-600">We couldn’t find a workspace linked to this account yet.</p>
      ) : null}
      {subscriptionError ? <p className="text-sm text-red-600">{subscriptionError}</p> : null}
      <button
        type="button"
        onClick={onSubscribe}
        disabled={subscribeBusy}
        className="inline-flex w-full justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
      >
        {subscribeBusy ? 'Redirecting…' : 'Subscribe'}
      </button>
    </div>
  )

  return (
    <>
      <div className="space-y-6 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-gray-900">{condition?.name ?? 'Loading condition...'}</h2>
          <p className="text-gray-800">
            Use the Handout Builder on the right to pick sections and export a PDF branded for your clinic.
          </p>
          {entitlementsStatus === 'loading' ? (
            <p className="text-sm text-gray-700">Checking billing status…</p>
          ) : null}
          {entitlementsStatus === 'ready' && !canExportHandouts ? (
            <div className="xl:hidden">{subscriptionGatePanel}</div>
          ) : null}
          {canExportHandouts && subscriptionError ? (
            <p className="text-sm text-red-600">{subscriptionError}</p>
          ) : null}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {loading && !condition && <p className="text-sm text-gray-700">Loading condition content…</p>}

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Practitioner Notes</h3>
          {condition?.content?.practitioner_notes ? (
            <div className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{condition.content.practitioner_notes}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-gray-700">Add practitioner notes in Supabase Studio.</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Citations</h3>
          {condition?.citations && condition.citations.length > 0 ? (
            <ol className="space-y-2 text-sm text-gray-800">
              {condition.citations.map((citation, index) => (
                <li key={citation.id} className="pl-1">
                  <span className="font-semibold text-gray-900">{index + 1}. </span>
                  {citation.url ? (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer font-medium text-gray-900 underline decoration-2 underline-offset-2 transition hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                    >
                      {citation.citation}
                    </a>
                  ) : (
                    <span>{citation.citation}</span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-700">No citations added yet.</p>
          )}
        </section>

        {condition?.content?.overview && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Overview preview</h3>
            <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
              {condition.content.overview}
            </pre>
          </section>
        )}
      </div>

      <aside className="hidden xl:block xl:col-start-3 xl:row-start-1">
        <div className="sticky top-24">
          {canExportHandouts ? (
            <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="font-medium">Handout Builder</h3>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">
                  <span>Patient name (required)</span>
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
                Your clinic logo and footer will appear automatically when you open the preview.
              </p>
            </div>
          ) : entitlementsStatus === 'ready' ? (
            subscriptionGatePanel
          ) : (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
              Checking billing status…
            </div>
          )}
        </div>
      </aside>

      {canExportHandouts ? (
        <HandoutPreviewModal
          open={previewOpen}
          document={previewDoc}
          filename={previewFilename}
          onClose={() => setPreviewOpen(false)}
          onOpen={onOpenPdf}
          opening={opening}
        />
      ) : null}
    </>
  )
}
