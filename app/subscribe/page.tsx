'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SubscribePage() {
  return (
    <Suspense fallback={null}>
      <SubscribeContent />
    </Suspense>
  )
}

function SubscribeContent() {
  const router = useRouter()
  const q = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const canceled = q.get('canceled')

  async function go() {
    setBusy(true)
    setErr(null)
    try {
      const response = await fetch('/api/billing/checkout-public', { method: 'POST' })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.error || 'Checkout failed')
      }
      router.push(json.url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed'
      setErr(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-3 text-4xl font-semibold">Subscribe to Nutrition Reference Pro</h1>
      <p className="mb-6 text-neutral-600">
        Plan: <strong>$49/mo</strong> • Single seat (one concurrent login).
      </p>
      {canceled ? (
        <p className="mb-3 rounded bg-yellow-50 p-3 text-yellow-900">Checkout was canceled.</p>
      ) : null}
      {err ? <p className="mb-3 text-red-600">{err}</p> : null}
      <button
        onClick={go}
        disabled={busy}
        className="rounded-md bg-black px-4 py-2 text-white transition disabled:opacity-50"
      >
        {busy ? 'Opening secure checkout…' : 'Continue to secure checkout'}
      </button>
    </main>
  )
}
