'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

type ClinicRow = {
  id: string
  clinic_name: string
  footer_text: string
  logo_path: string | null
}

export default function BrandingPage() {
  const [uid, setUid] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState('')
  const [footerText, setFooterText] = useState('')
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Loading...')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setStatus('Checking session...')
      const { data: sess } = await supabase.auth.getSession()
      const user = sess.session?.user
      if (!user) {
        setStatus('Please sign in')
        return
      }
      if (!mounted) return
      setUid(user.id)
      setStatus('Loading clinic settings...')
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
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
  }, [])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
    }
  }, [logoPreviewUrl])

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

  function fileExt(mime: string) {
    if (mime === 'image/png') return 'png'
    if (mime === 'image/webp') return 'webp'
    return 'jpg'
  }

  async function onSelectLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uid) return
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
    const newPath = `${uid}/logo-${Date.now()}.${fileExt(file.type)}`
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
    if (!uid) return
    setBusy(true)
    setError(null)
    setStatus('Saving...')
    const payload: ClinicRow = {
      id: uid,
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

  return (
    <main className="p-6">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Clinic Branding</h1>
          <p className="text-sm text-gray-600">Upload your logo and set the footer that appears on exported PDFs.</p>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Clinic name</span>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g., Eastside Family Clinic"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Footer text</span>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 h-24"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Custom footer text for PDFs"
              />
            </label>
          </div>

          <div className="space-y-3">
            <span className="text-sm font-medium">Logo</span>
            <div className="flex items-start gap-4">
              <div className="w-40 h-40 rounded-xl border bg-white flex items-center justify-center overflow-hidden">
                {logoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Logo preview" src={logoPreviewUrl} className="max-w-full max-h-full" />
                ) : (
                  <span className="text-xs text-gray-500">No logo</span>
                )}
              </div>
              <div className="space-y-2">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onSelectLogo} />
                {logoPath && <p className="text-xs text-gray-500 break-all">Stored as: {logoPath}</p>}
                {logoPath && (
                  <button
                    type="button"
                    className="text-sm underline text-red-600"
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
            <button className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60" disabled={busy}>
              {busy ? 'Saving...' : 'Save changes'}
            </button>
            <span className="text-sm text-gray-600">{status}</span>
            {error && <span className="text-sm text-red-600">Error: {error}</span>}
          </div>
        </form>
      </div>
    </main>
  )
}
