import type { Metadata } from 'next'
import { MarketingHome } from '@/components/MarketingHome'

const features = [
  {
    title: 'Branded PDF exports in seconds',
    description:
      'Generate handouts that automatically pull your clinic logo, colors, and footer so every patient leaves with polished guidance.',
  },
  {
    title: 'Seat leasing built for real teams',
    description:
      'Lease tracking keeps access consistent across devices and tabs, while automated cleanup frees up seats for active clinicians.',
  },
  {
    title: 'Server-backed entitlements',
    description:
      'Centralized permissions guarantee that export, branding, and billing decisions stay aligned with your latest subscription.',
  },
  {
    title: 'Evidence-based condition library',
    description:
      'Reference practitioner notes, meal plans, and curated citations so your staff can answer questions with confidence.',
  },
]

const highlights = [
  {
    title: 'Clinician-grade content',
    details: 'Professionally vetted protocols with citations ready for handouts or team review.',
  },
  {
    title: 'Seat-aware billing',
    details: 'Stripe-powered subscriptions stay synchronized with workspace access and invoices.',
  },
  {
    title: 'Secure patient exports',
    details: 'Handouts render client-side with branded touches, while sensitive data never leaves your control.',
  },
]

export const metadata: Metadata = {
  title: 'Nutrition Reference PRO',
  description:
    'Nutrition Reference PRO delivers evidence-based handouts, seat-aware billing, and branded exports for modern clinics.',
  openGraph: {
    title: 'Nutrition Reference PRO',
    description:
      'Deliver evidence-based handouts, manage seats with confidence, and keep billing in sync with Nutrition Reference PRO.',
  },
}

export default function HomePage() {
  return <MarketingHome features={features} highlights={highlights} />
}
