'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { fetchWithAuth } from '@/lib/auth-fetch'

type SubscriptionRow = {
  status: string
  seat_count: number
  billing_method: string
  current_period_end: string | null
  stripe_customer_id: string | null
}

type InvoiceFormState = {
  legalName: string
  taxId: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  contactEmail: string
}

const initialInvoiceState: InvoiceFormState = {
  legalName: '',
  taxId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  contactEmail: '',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

export default function BillingPage() {
  const params = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'checkout' | 'portal' | 'invoice' | null>(null)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(initialInvoiceState)
  const [invoiceMessage, setInvoiceMessage] = useState<string | null>(null)

  const loadSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess.session?.user?.id
      if (!uid) {
        setError('Please sign in to view billing.')
        setSubscription(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, seat_count, billing_method, current_period_end, stripe_customer_id')
        .eq('clinic_id', uid)
        .maybeSingle<SubscriptionRow>()

      if (error) {
        setError(error.message)
        setSubscription(null)
      } else {
        setSubscription(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  const successMessage = useMemo(() => {
    if (params.get('success')) return 'Subscription updated successfully.'
    if (params.get('canceled')) return 'Checkout was canceled.'
    return null
  }, [params])

  async function startCheckout() {
    setBusyAction('checkout')
    try {
      const response = await fetchWithAuth('/api/billing/checkout', { method: 'POST' })
      const payload = (await response.json()) as { url?: string }
      if (!payload?.url) throw new Error('Unable to start Stripe Checkout.')
      window.location.href = payload.url
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : String(checkoutError)
      setError(message)
    } finally {
      setBusyAction(null)
    }
  }

  async function openPortal() {
    setBusyAction('portal')
    try {
      const response = await fetchWithAuth('/api/billing/portal', { method: 'POST' })
      const payload = (await response.json()) as { url?: string }
      if (!payload?.url) throw new Error('Unable to open the billing portal.')
      window.location.href = payload.url
    } catch (portalError) {
      const message = portalError instanceof Error ? portalError.message : String(portalError)
      setError(message)
    } finally {
      setBusyAction(null)
    }
  }

  async function submitInvoiceRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyAction('invoice')
    setInvoiceMessage(null)
    try {
      const response = await fetchWithAuth('/api/billing/invoice-request', {
        method: 'POST',
        body: JSON.stringify(invoiceForm),
      })
      await response.json()
      setInvoiceMessage('Invoice draft requested. We will reach out shortly.')
      setInvoiceForm(initialInvoiceState)
      await loadSubscription()
    } catch (invoiceError) {
      const message = invoiceError instanceof Error ? invoiceError.message : String(invoiceError)
      setInvoiceMessage(message)
    } finally {
      setBusyAction(null)
    }
  }

  function updateInvoiceField<K extends keyof InvoiceFormState>(key: K, value: InvoiceFormState[K]) {
    setInvoiceForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-700">
          Manage your Nutrition Reference Pro subscription. Plan: Single seat ($49/mo).
        </p>
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Current plan</h2>
        {loading ? (
          <p className="mt-2 text-sm text-gray-700">Loading subscription…</p>
        ) : subscription ? (
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-800 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-gray-900">Status</dt>
              <dd className="capitalize">{subscription.status || 'inactive'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900">Concurrent seats</dt>
              <dd>{subscription.seat_count}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900">Billing method</dt>
              <dd className="capitalize">{subscription.billing_method || 'card'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900">Next bill date</dt>
              <dd>{formatDate(subscription.current_period_end)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-gray-700">No subscription on file yet.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startCheckout}
            disabled={busyAction === 'checkout'}
            className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
          >
            {busyAction === 'checkout' ? 'Redirecting…' : 'Subscribe'}
          </button>
          <button
            type="button"
            onClick={openPortal}
            disabled={busyAction === 'portal' || !subscription?.stripe_customer_id}
            className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-60"
          >
            {busyAction === 'portal' ? 'Opening…' : 'Update seats / Payment method'}
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Request an invoice</h2>
          <p className="text-sm text-gray-700">
            Prefer institutional billing? Submit the form and we will send a draft invoice for approval.
          </p>
        </div>
        {invoiceMessage ? <p className="text-sm text-gray-700">{invoiceMessage}</p> : null}
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitInvoiceRequest}>
          <label className="sm:col-span-2 text-sm font-medium text-gray-900">
            Legal name
            <input
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.legalName}
              onChange={(event) => updateInvoiceField('legalName', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-900">
            Tax ID
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.taxId}
              onChange={(event) => updateInvoiceField('taxId', event.target.value)}
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-gray-900">
            Contact email
            <input
              type="email"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.contactEmail}
              onChange={(event) => updateInvoiceField('contactEmail', event.target.value)}
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-gray-900">
            Address line 1
            <input
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.addressLine1}
              onChange={(event) => updateInvoiceField('addressLine1', event.target.value)}
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-gray-900">
            Address line 2
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.addressLine2}
              onChange={(event) => updateInvoiceField('addressLine2', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-900">
            City
            <input
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.city}
              onChange={(event) => updateInvoiceField('city', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-900">
            State / Province
            <input
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.state}
              onChange={(event) => updateInvoiceField('state', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-900">
            Postal code
            <input
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.postalCode}
              onChange={(event) => updateInvoiceField('postalCode', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-900">
            Country
            <input
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:border-gray-500"
              value={invoiceForm.country}
              onChange={(event) => updateInvoiceField('country', event.target.value)}
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busyAction === 'invoice'}
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-60"
            >
              {busyAction === 'invoice' ? 'Submitting…' : 'Request invoice'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
