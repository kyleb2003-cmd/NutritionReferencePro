'use client'

import { useState } from 'react'

type LookupResponse =
  | {
      ok: true
      email: string | null
      username: string | null
      userId: string
      clinicId: string | null
      subscriptionStatus: string | null
      currentPeriodEnd: string | null
      priceId: string | null
      entitlements: {
        hasMembership: boolean
        canExportHandouts: boolean
        canAccessBranding: boolean
        leaseRecent: boolean
        leaseLastSeen: string | null
      }
    }
  | {
      ok: false
      error: string
    }

export default function SupportLookupPage() {
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LookupResponse | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const response = await fetch('/api/support/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json()) as LookupResponse
      if (!response.ok) {
        setError(payload.ok ? 'Unexpected error' : payload.error)
        setResult(payload)
      } else {
        setResult(payload)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Support Lookup</h1>
        <p className="text-sm text-gray-700">
          Provide the support token and user email to inspect clinic context. Data is read-only.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-gray-900">Support token</span>
          <input
            type="password"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Bearer token from SUPPORT_LOOKUP_TOKEN"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-900">User email</span>
          <input
            type="email"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@example.com"
            required
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Looking up…' : 'Lookup'}
        </button>
        {error ? <p className="text-sm text-red-600">Error: {error}</p> : null}
      </form>

      {result ? (
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Result</h2>
          <pre className="whitespace-pre-wrap break-all rounded bg-gray-50 p-4 text-xs text-gray-900">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      ) : null}
    </main>
  )
}
