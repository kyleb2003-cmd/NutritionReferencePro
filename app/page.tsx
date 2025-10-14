export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="text-lg font-semibold">Nutrition Reference Pro</div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/auth/sign-in" className="hover:underline">Sign in</a>
          <a href="/auth/sign-up" className="rounded-md border px-3 py-1.5 hover:bg-gray-100">Create account</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="inline-block rounded-full border px-3 py-1 text-xs text-gray-600">
            Built for clinics without dietitians
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Consistent, branded, evidence-based nutrition handouts—fast.
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Nutrition Reference Pro lets providers generate professional education materials in minutes.
            Search conditions, select sections, and export polished PDFs with your clinic’s logo and footer.
          </p>
          <div className="flex gap-3">
            <a
              href="/auth/sign-up"
              className="rounded-xl bg-black text-white px-5 py-3 shadow hover:shadow-md transition"
            >
              Get started
            </a>
            <a
              href="/auth/sign-in"
              className="rounded-xl border px-5 py-3 hover:bg-gray-100 transition"
            >
              Sign in
            </a>
          </div>
          <ul className="grid gap-3 pt-4 text-sm text-gray-700">
            <li>• Evidence-based content with citations and “Printed on” date</li>
            <li>• Clinic branding: logo + custom footer</li>
            <li>• Search by condition and build handouts by section</li>
            <li>• Export to PDF—consistent, readable, and ready for patients</li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="h-6 w-3/4 rounded bg-gray-100" />
            <div className="h-24 w-full rounded bg-gray-100" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded bg-gray-100" />
              <div className="h-20 rounded bg-gray-100" />
            </div>
            <div className="h-10 w-full rounded bg-gray-900" />
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Preview of the handout builder interface.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-gray-700">
          <li className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-1">1. Search & select</div>
            Choose a condition from our taxonomy and pick the sections you need.
          </li>
          <li className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-1">2. Brand your handout</div>
            Upload your clinic logo and set a professional footer once.
          </li>
          <li className="rounded-xl border bg-white p-4">\n            <div className="font-medium mb-1">3. Export to PDF</div>
            Generate a consistent, evidence-based PDF—ready for patients.
          </li>
        </ol>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-12 text-xs text-gray-500">
        © {new Date().getFullYear()} Nutrition Reference Pro · Next.js · Supabase · Tailwind
      </footer>
    </main>
  )
}
