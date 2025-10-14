export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-50 text-gray-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold tracking-tight text-gray-900">Nutrition Reference Pro</div>
        <nav className="flex items-center gap-5 text-sm font-medium text-gray-800">
          <a
            href="/auth/sign-in"
            className="inline-flex items-center rounded-md px-2 py-1 transition hover:underline"
          >
            Sign in
          </a>
          <a
            href="/auth/sign-up"
            className="inline-flex items-center rounded-md border border-gray-900 px-3 py-1.5 font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
          >
            Create account
          </a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="inline-block rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800">
            Built for clinics without dietitians
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            Consistent, branded, evidence-based nutrition handouts—fast.
          </h1>
          <p className="text-lg leading-relaxed text-gray-800">
            Nutrition Reference Pro lets providers generate professional education materials in minutes. Search
            conditions, select sections, and export polished PDFs with your clinic’s logo and footer.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/auth/sign-up"
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-black/90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            >
              Get started
            </a>
            <a
              href="/auth/sign-in"
              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-900 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            >
              Sign in
            </a>
          </div>
          <ul className="grid gap-2 pt-4 text-sm text-gray-800">
            <li className="list-disc pl-5">Evidence-based content with citations and “Printed on” date</li>
            <li className="list-disc pl-5">Clinic branding: logo + custom footer</li>
            <li className="list-disc pl-5">Search by condition and build handouts by section</li>
            <li className="list-disc pl-5">Export to PDF—consistent, readable, and ready for patients</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-6 w-3/4 rounded bg-gray-200" />
            <div className="h-24 w-full rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded bg-gray-200" />
              <div className="h-20 rounded bg-gray-200" />
            </div>
            <div className="h-10 w-full rounded bg-gray-900" />
          </div>
          <p className="mt-4 text-xs font-medium text-gray-700">
            Preview of the handout builder interface.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-xl font-semibold text-gray-900">How it works</h2>
        <ol className="mt-4 grid gap-4 text-sm text-gray-800 md:grid-cols-3">
          <li className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 font-semibold text-gray-900">1. Search & select</div>
            Choose a condition from our taxonomy and pick the sections you need.
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 font-semibold text-gray-900">2. Brand your handout</div>
            Upload your clinic logo and set a professional footer once.
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 font-semibold text-gray-900">3. Export to PDF</div>
            Generate a consistent, evidence-based PDF—ready for patients.
          </li>
        </ol>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-12 text-xs font-medium text-gray-700">
        © {new Date().getFullYear()} Nutrition Reference Pro · Next.js · Supabase · Tailwind
      </footer>
    </main>
  )
}
