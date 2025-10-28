'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { useSeatLease } from '@/components/AuthGate'

type ClinicRow = {
  id: string
  clinic_name: string
  footer_text: string
  logo_path: string | null
}

export default function BrandingPage() {
  const { workspaceId } = useSeatLease()
  const [clinicName, setClinicName] = useState('')
  const [footerText, setFooterText] = useState('')
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Loading...')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'loading' | 'active' | 'inactive'>('loading')
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [subscribeBusy, setSubscribeBusy] = useState(false)

  async function loadPreview(path: string) {
    const { data, error } = await supabase.storage.from('branding').download(path)
    if (error || !data) return
    const url = URL.createObjectURL(data)
    setLogoPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return url
    })
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setStatus('Checking workspace…')
      setSubscriptionStatus('loading')
      if (!workspaceId) {
        if (!mounted) return
        setSubscriptionStatus('inactive')
        setStatus('Workspace not linked to this account.')
        return
      }

      setStatus('Checking subscription…')
      const { data: sub, error: subscriptionFetchError } = await supabase
        .from('subscriptions')
        .select('status, seat_count')
        .eq('clinic_id', workspaceId)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      if (!mounted) return

      if (subscriptionFetchError) {
        setSubscriptionError(subscriptionFetchError.message)
        setSubscriptionStatus('inactive')
        setStatus('')
        return
      }

      if (!sub) {
        setSubscriptionStatus('inactive')
        setStatus('')
        return
      }

      setSubscriptionStatus('active')
      setSubscriptionError(null)
      setStatus('Loading clinic settings...')

      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', workspaceId)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        setError(error.message)
        setStatus('')
        return
      }

      const row = data as ClinicRow | null
      if (row) {
        setClinicName(row.clinic_name ?? '')
        setFooterText(row.footer_text ?? '')
        setLogoPath(row.logo_path ?? null)
        if (row.logo_path) {
          await loadPreview(row.logo_path)
        }
      }

      setStatus('')
    })()

    return () => {
      mounted = false
    }
  }, [workspaceId])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
    }
  }, [logoPreviewUrl])

  function fileExt(mime: string) {
    if (mime === 'image/png') return 'png'
    if (mime === 'image/webp') return 'webp'
    return 'jpg'
  }

  async function onSelectLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return
    setBusy(true)
    setError(null)
    setStatus('Uploading logo...')

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Please upload PNG, JPG, or WEBP.')
      setBusy(false)
      setStatus('')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Max file size is 5 MB.')
      setBusy(false)
      setStatus('')
      return
    }

    const prev = logoPath
    const newPath = `${workspaceId}/logo-${Date.now()}.${fileExt(file.type)}`
    if (prev && prev !== newPath) {
      await supabase.storage.from('branding').remove([prev]).catch(() => {})
    }

    const { error: upErr } = await supabase.storage
      .from('branding')
      .upload(newPath, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      setStatus('')
      return
    }

    setLogoPath(newPath)
    await loadPreview(newPath)
    setBusy(false)
    setStatus("Logo uploaded. Don't forget to Save.")
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId) return
    setBusy(true)
    setError(null)
    setStatus('Saving...')
    const payload: ClinicRow = {
      id: workspaceId,
      clinic_name: clinicName ?? '',
      footer_text: footerText ?? '',
      logo_path: logoPath ?? null,
    }
    const { error } = await supabase.from('clinics').upsert(payload).select().single()
    setBusy(false)
    if (error) {
      setError(error.message)
      setStatus('')
      return
    }
    setStatus('Saved')
    setTimeout(() => setStatus(''), 1200)
  }

  async function onSubscribe() {
    if (!workspaceId) {
      setSubscriptionError('Workspace missing. Please complete setup or contact support.')
      return
    }
    setSubscriptionError(null)
    setSubscribeBusy(true)
    try {
      const response = await fetchWithAuth('/api/billing/checkout', { method: 'POST' })
      const payload = (await response.json()) as { url?: string }
      if (payload?.url) {
        window.location.href = payload.url
      } else {
        throw new Error('Stripe checkout URL missing.')
      }
    } catch (subscribeErr) {
      const message = subscribeErr instanceof Error ? subscribeErr.message : String(subscribeErr)
      setSubscriptionError(message)
    } finally {
      setSubscribeBusy(false)
    }
  }

  if (subscriptionStatus === 'loading') {
    return (
      <main className="p-6">
        <div className="max-w-3xl space-y-4 text-sm text-gray-700">
          <p>Checking subscription…</p>
        </div>
      </main>
    )
  }

  if (subscriptionStatus !== 'active') {
    return (
      <main className="p-6">
        <div className="max-w-3xl space-y-6 rounded-xl border border-dashed border-gray-300 bg-white p-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Billing required</h1>
            <p className="mt-2 text-sm text-gray-700">
              Subscribe to unlock clinic branding and PDF exports for your team.
            </p>
          </div>
          {subscriptionError ? <p className="text-sm text-red-600">{subscriptionError}</p> : null}
          <button
            type="button"
            onClick={onSubscribe}
            disabled={subscribeBusy}
            className="inline-flex w-full max-w-xs justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
          >
            {subscribeBusy ? 'Redirecting…' : 'Subscribe'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Clinic Branding</h1>
          <p className="text-sm text-gray-800">
            Upload your logo and set the footer that appears on exported PDFs.
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">Clinic name</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus-visible:border-gray-500"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g., Eastside Family Clinic"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-gray-900">Footer text</span>
              <textarea
                className="mt-1 h-24 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus-visible:border-gray-500"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Custom footer text for PDFs"
              />
            </label>
          </div>

          <div className="space-y-3">
            <span className="text-sm font-medium text-gray-900">Logo</span>
            <div className="flex items-start gap-4">
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white">
                {logoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Logo preview" src={logoPreviewUrl} className="max-w-full max-h-full" />
                ) : (
                  <span className="px-3 text-center text-xs font-medium text-gray-700">No logo uploaded</span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onSelectLogo}
                  className="text-sm text-gray-800 file:mr-2 file:cursor-pointer file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                />
                {logoPath && <p className="break-all text-xs text-gray-700">Stored as: {logoPath}</p>}
                {logoPath && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-red-600 underline hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                    onClick={async () => {
                      if (!logoPath) return
                      setBusy(true)
                      await supabase.storage.from('branding').remove([logoPath]).catch(() => {})
                      setLogoPreviewUrl((prev) => {
                        if (prev) {
                          URL.revokeObjectURL(prev)
                        }
                        return null
                      })
                      setLogoPath(null)
                      setBusy(false)
                    }}
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              className="inline-flex cursor-pointer items-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:cursor-not-allowed disabled:bg-gray-600"
              disabled={busy}
            >
              {busy ? 'Saving...' : 'Save changes'}
            </button>
            <span className="text-sm text-gray-700">{status}</span>
            {error && <span className="text-sm text-red-600">Error: {error}</span>}
          </div>
        </form>
      </div>
    </main>
  )
}
