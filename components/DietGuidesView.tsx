'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import HandoutPDF from '@/components/pdf/HandoutPDF'
import { useEntitlements } from '@/components/EntitlementsProvider'
import { useSeatLease } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-client'
import { blobToDataUrl, openPdfInNewTab } from '@/lib/pdf'
import { fetchWithAuth } from '@/lib/auth-fetch'
import type { DietGuide } from '@/content/diets'

type DietGuidesViewProps = {
  guides: DietGuide[]
}

type BrandingDetails = {
  clinicName: string
  footerText: string
  logoDataUrl: string | null
}

const defaultBranding: BrandingDetails = {
  clinicName: '',
  footerText: '',
  logoDataUrl: null,
}

function sectionMarkdownFromList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

function buildPdfSections(diet: DietGuide, practitionerNotes: string): { label: string; text: string }[] {
  const sections = [
    { label: 'What it is / Who it\'s for', text: diet.whatItIs },
    { label: 'Core principles', text: sectionMarkdownFromList(diet.corePrinciples) },
    { label: 'Sample plate', text: sectionMarkdownFromList(diet.samplePlate) },
    { label: 'Swaps', text: sectionMarkdownFromList(diet.swaps) },
    { label: 'Getting started', text: sectionMarkdownFromList(diet.gettingStarted) },
    {
      label: 'For more information',
      text: sectionMarkdownFromList(diet.moreInfo.map((info) => `${info.label} — ${info.url}`)),
    },
  ]

  const cleanNotes = practitionerNotes.trim()
  if (cleanNotes) {
    sections.push({ label: 'Practitioner notes', text: cleanNotes })
  }

  sections.push({ label: 'Disclaimer', text: diet.disclaimer })

  return sections
}

async function loadBranding(workspaceId: string | null): Promise<BrandingDetails> {
  if (!workspaceId) {
    return defaultBranding
  }
  const { data, error } = await supabase
    .from('clinics')
    .select('clinic_name, footer_text, logo_path')
    .eq('id', workspaceId)
    .maybeSingle<{ clinic_name: string | null; footer_text: string | null; logo_path: string | null }>()

  if (error) {
    console.warn('[diets.branding] failed to load clinic', { workspaceId, error })
    return defaultBranding
  }

  let logoDataUrl: string | null = null
  if (data?.logo_path) {
    const result = await supabase.storage.from('branding').download(data.logo_path)
    if (!result.error && result.data) {
      try {
        logoDataUrl = await blobToDataUrl(result.data)
      } catch (convertError) {
        console.warn('[diets.branding] failed to convert logo', convertError)
      }
    }
  }

  return {
    clinicName: data?.clinic_name ?? '',
    footerText: data?.footer_text ?? '',
    logoDataUrl,
  }
}

function useDietSelection(guides: DietGuide[]) {
  const [manualSlug, setManualSlug] = useState(guides[0]?.slug ?? '')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return guides
    return guides.filter((guide) => guide.name.toLowerCase().includes(term))
  }, [guides, search])

  const selectedSlug = useMemo(() => {
    if (filtered.length === 0) {
      return manualSlug
    }
    return filtered.some((guide) => guide.slug === manualSlug) ? manualSlug : filtered[0].slug
  }, [filtered, manualSlug])

  return {
    selectedSlug,
    setSelectedSlug: setManualSlug,
    search,
    setSearch,
    filtered,
  }
}

export default function DietGuidesView({ guides }: DietGuidesViewProps) {
  const { selectedSlug, setSelectedSlug, search, setSearch, filtered } = useDietSelection(guides)
  const selected = useMemo(() => guides.find((guide) => guide.slug === selectedSlug) ?? guides[0], [guides, selectedSlug])
  const lastLoggedSlug = useRef<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [patientError, setPatientError] = useState<string | null>(null)
  const [practitionerNotes, setPractitionerNotes] = useState('')
  const [printing, setPrinting] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [subscribeBusy, setSubscribeBusy] = useState(false)
  const { workspaceId } = useSeatLease()
  const { status: entitlementsStatus, canExportHandouts, refreshEntitlements } = useEntitlements()

  useEffect(() => {
    if (selected && lastLoggedSlug.current !== selected.slug) {
      console.info('[diets.view] diet=%s', selected.slug)
      lastLoggedSlug.current = selected.slug
    }
  }, [selected])

  const handleSelect = (slug: string) => {
    if (slug === selectedSlug) return
    setSelectedSlug(slug)
  }

  const handlePrint = async () => {
    if (!selected) return
    const trimmedName = patientName.trim()
    if (!trimmedName) {
      setPatientError('Patient name is required to generate the handout.')
      return
    }
    if (!canExportHandouts) {
      const refreshed = await refreshEntitlements()
      if (!refreshed.canExportHandouts) {
        setSubscriptionError('An active subscription is required to export handouts.')
        return
      }
    }

    setPatientError(null)
    setSubscriptionError(null)
    setPrinting(true)
    try {
      const branding = await loadBranding(workspaceId)
      const printedOn = new Date().toLocaleDateString()
      const pdfSections = buildPdfSections(selected, practitionerNotes)
      const doc = (
        <HandoutPDF
          clinicName={branding.clinicName}
          footerText={branding.footerText}
          logoDataUrl={branding.logoDataUrl}
          conditionName={`${selected.name} Diet Guide`}
          patientName={trimmedName}
          printedOn={printedOn}
          sections={pdfSections}
        />
      ) as ReactElement<DocumentProps>

      console.info('[diets.print] diet=%s', selected.slug)
      const safeSlug = selected.slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
      await openPdfInNewTab(doc, `${safeSlug}-diet-handout.pdf`)
    } catch (error) {
      console.error('[diets.print] failed', error)
      alert('Unable to generate the handout. Please try again.')
    } finally {
      setPrinting(false)
    }
  }

  const handleSubscribe = async () => {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSubscriptionError(message)
    } finally {
      setSubscribeBusy(false)
      void refreshEntitlements()
    }
  }

  if (!selected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
        Unable to load diet guides. Please contact support.
      </div>
    )
  }

  const subscriptionGatePanel = (
    <div className="space-y-3 rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Subscribe to export handouts</h3>
        <p className="text-sm text-gray-700">
          An active plan unlocks PDF exports and clinic branding for diet handouts.
        </p>
      </div>
      {!workspaceId ? (
        <p className="text-sm text-amber-600">We couldn’t find a workspace linked to this account yet.</p>
      ) : null}
      {subscriptionError ? <p className="text-sm text-red-600">{subscriptionError}</p> : null}
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={subscribeBusy}
        className="inline-flex w-full justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
      >
        {subscribeBusy ? 'Redirecting…' : 'Subscribe'}
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <label className="block text-sm font-medium text-gray-900">
          <span>Select a diet</span>
          <select
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus-visible:border-gray-500"
            value={selectedSlug}
            onChange={(event) => handleSelect(event.target.value)}
          >
            {guides.map((guide) => (
              <option key={guide.slug} value={guide.slug}>
                {guide.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium text-gray-900">
          <span>Search diets</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus-visible:border-gray-500"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-900">
              <span>Search diets</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus-visible:border-gray-500"
              />
            </label>
            <ul className="mt-4 space-y-1">
              {filtered.length ? (
                filtered.map((guide) => {
                  const isActive = guide.slug === selectedSlug
                  return (
                    <li key={guide.slug}>
                      <button
                        type="button"
                        onClick={() => handleSelect(guide.slug)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 ${
                          isActive ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        {guide.name}
                      </button>
                    </li>
                  )
                })
              ) : (
                <li className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  No diets match that search.
                </li>
              )}
            </ul>
          </div>
        </aside>

        <div className="space-y-6 lg:col-start-2">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">Therapeutic Diet Guides</h1>
            <p className="text-sm text-gray-700">
              Browse evidence-informed diet overviews. Use the handout builder to share patient-ready summaries with
              clinic branding when enabled.
            </p>
          </div>

          <article className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Diet guide</p>
              <h2 className="text-2xl font-semibold text-gray-900">{selected.name}</h2>
            </header>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">What it is / Who it’s for</h3>
              <p className="text-sm text-gray-800">{selected.whatItIs}</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Core principles</h3>
              <ul className="space-y-2 text-sm text-gray-800">
                {selected.corePrinciples.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Sample plate</h3>
              <ul className="space-y-2 text-sm text-gray-800">
                {selected.samplePlate.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Swaps</h3>
              <ul className="space-y-2 text-sm text-gray-800">
                {selected.swaps.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Getting started</h3>
              <ul className="space-y-2 text-sm text-gray-800">
                {selected.gettingStarted.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">For more information</h3>
              <ul className="space-y-2 text-sm text-gray-800">
                {selected.moreInfo.map((info) => (
                  <li key={info.url}>
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-gray-900 underline decoration-2 underline-offset-2 transition hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                    >
                      {info.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2 border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900">Disclaimer</h3>
              <p className="text-sm text-gray-700">{selected.disclaimer}</p>
            </section>
          </article>
        </div>

        <aside className="lg:col-start-3">
          <div className="sticky top-24 space-y-4">
            {entitlementsStatus === 'loading' ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
                Checking export access…
              </div>
            ) : null}

            {entitlementsStatus === 'ready' && !canExportHandouts ? (
              subscriptionGatePanel
            ) : (
              <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="font-medium text-gray-900">Handout Builder</h3>
                <p className="text-sm text-gray-700">
                  Generate a patient-ready handout with optional clinic branding when enabled.
                </p>
                {subscriptionError ? <p className="text-sm text-red-600">{subscriptionError}</p> : null}
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
                <label className="block text-sm font-medium text-gray-900">
                  <span>Practitioner’s notes (optional)</span>
                  <textarea
                    className="mt-1 h-28 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
                    value={practitionerNotes}
                    onChange={(event) => setPractitionerNotes(event.target.value)}
                    placeholder="Document individualized considerations or follow-up instructions"
                  />
                </label>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={printing}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
                >
                  {printing ? 'Generating…' : 'Generate & Print Handout'}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
