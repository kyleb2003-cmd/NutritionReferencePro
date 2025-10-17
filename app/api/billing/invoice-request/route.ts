import { NextRequest, NextResponse } from 'next/server'
import { stripe, LOOKUP_SINGLE, priceId } from '@/lib/stripe'
import { requireAuthContext, isAuthError } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { upsertSubscription } from '@/lib/subscription'

export const runtime = 'nodejs'

type InvoiceRequestBody = {
  legalName: string
  taxId?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  contactEmail?: string
}

function validate(payload: InvoiceRequestBody) {
  if (!payload.legalName?.trim()) {
    throw new Error('Legal name is required')
  }
  if (!payload.addressLine1?.trim()) {
    throw new Error('Address line 1 is required')
  }
  if (!payload.city?.trim()) {
    throw new Error('City is required')
  }
  if (!payload.state?.trim()) {
    throw new Error('State is required')
  }
  if (!payload.postalCode?.trim()) {
    throw new Error('Postal code is required')
  }
  if (!payload.country?.trim()) {
    throw new Error('Country is required')
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as InvoiceRequestBody
    validate(payload)

    const seatCount = 1

    const ctx = await requireAuthContext(request)
    const singleId = await priceId(LOOKUP_SINGLE)

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('clinic_id', ctx.clinicId)
      .maybeSingle()

    let stripeCustomerId = subscription?.stripe_customer_id ?? null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: payload.contactEmail ?? ctx.email ?? undefined,
        name: payload.legalName,
        metadata: {
          clinic_id: ctx.clinicId,
          billing_mode: 'invoice',
        },
        address: {
          line1: payload.addressLine1,
          line2: payload.addressLine2,
          city: payload.city,
          state: payload.state,
          postal_code: payload.postalCode,
          country: payload.country,
        },
      })
      stripeCustomerId = customer.id
    } else {
      await stripe.customers.update(stripeCustomerId, {
        email: payload.contactEmail ?? ctx.email ?? undefined,
        name: payload.legalName,
        metadata: {
          clinic_id: ctx.clinicId,
          billing_mode: 'invoice',
          legal_name: payload.legalName,
          tax_id: payload.taxId ?? '',
        },
        address: {
          line1: payload.addressLine1,
          line2: payload.addressLine2,
          city: payload.city,
          state: payload.state,
          postal_code: payload.postalCode,
          country: payload.country,
        },
      })
    }

    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      price: singleId,
      quantity: seatCount,
    })

    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: {
        clinic_id: ctx.clinicId,
        billing_mode: 'invoice',
      },
      auto_advance: true,
    })

    await upsertSubscription({
      clinic_id: ctx.clinicId,
      stripe_customer_id: stripeCustomerId,
      billing_method: 'invoice',
      status: 'incomplete',
      seat_count: seatCount,
    })

    return NextResponse.json({ ok: true, invoiceId: invoice.id })
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('invoice-request error', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
