'use client'

import { useEffect } from 'react'
import Link from 'next/link'

type Feature = {
  title: string
  description: string
}

type Highlight = {
  title: string
  details: string
}

type MarketingHomeProps = {
  features: Feature[]
  highlights: Highlight[]
}

export function MarketingHome({ features, highlights }: MarketingHomeProps) {
  useEffect(() => {
    console.info('[marketing.home] viewed')
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Nutrition Reference PRO
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-700">
            <Link href="/diets" className="hover:text-gray-900">
              Therapeutic Diet Guides
            </Link>
            <Link href="/preview/ibs" className="hover:text-gray-900">
              IBS Preview
            </Link>
            <Link href="/sign-up" className="rounded-lg bg-black px-3 py-1.5 text-white transition hover:bg-black/90">
              Sign Up
            </Link>
            <Link
              href="/auth/sign-in"
              className="rounded-lg border border-gray-300 px-3 py-1.5 transition hover:border-gray-400 hover:text-gray-900"
            >
              Log In
            </Link>
            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-transparent px-3 py-1.5 text-gray-700 transition hover:text-gray-900 sm:inline-flex"
            >
              Go to Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-white via-white to-gray-50">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center">
            <div className="max-w-xl space-y-6">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Build confidence with every handout
              </span>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                Evidence-backed nutrition handouts tailored for busy clinics.
              </h1>
              <p className="text-lg text-gray-700">
                Nutrition Reference PRO keeps your team aligned with searchable clinical content, branded PDF exports,
                and billing that understands seat-based access.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/90"
                >
                  Start your free trial
                </Link>
                <Link
                  href="/preview/ibs"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
                >
                  Explore the IBS preview
                </Link>
              </div>
              <p className="text-sm text-gray-600">
                Already onboarded?{' '}
                <Link href="/auth/sign-in" className="font-semibold text-gray-900 hover:text-gray-700">
                  Log in to continue
                </Link>
                .
              </p>
            </div>
            <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900">What you get</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {highlights.map((item) => (
                  <li key={item.title} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-gray-700">{item.details}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold text-gray-900">Why clinicians choose Nutrition Reference PRO</h2>
            <p className="mt-3 max-w-3xl text-base text-gray-700">
              Designed with dietitians and care teams in mind, the platform keeps patient-facing material accurate while
              giving operations clear controls for seats, billing, and entitlements.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-700">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center">
            <h2 className="text-3xl font-semibold text-gray-900">Ready to empower every patient conversation?</h2>
            <p className="max-w-2xl text-base text-gray-700">
              Launch your clinic workspace in minutes, invite teammates with seat leasing safeguards, and export
              beautifully branded handouts without juggling half a dozen tools.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/90"
              >
                Create your workspace
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-sm text-gray-600 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Nutrition Reference PRO. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/preview/ibs" className="hover:text-gray-900">
              IBS Preview
            </Link>
            <Link href="/sign-up" className="hover:text-gray-900">
              Sign Up
            </Link>
            <Link href="/auth/sign-in" className="hover:text-gray-900">
              Log In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
