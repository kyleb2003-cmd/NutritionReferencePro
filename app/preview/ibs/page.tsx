import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getServiceClient } from '@/lib/supabase/clients'

type ConditionContent = {
  overview?: string | null
  mealplan_1400?: string | null
  mealplan_1800?: string | null
  mealplan_2200?: string | null
  mealplan_2600?: string | null
  shopping_list?: string | null
  rd_referral?: string | null
  eat_this_not_that?: string | null
}

type ConditionCitation = {
  id: number
  citation: string
  url: string | null
}

type ConditionRow = {
  name: string
  slug: string
  content: ConditionContent[] | null
  citations: ConditionCitation[] | null
}

export const revalidate = 300

async function fetchIbsContent() {
  const supa = getServiceClient()
  const { data, error } = await supa
    .from('conditions')
    .select(
      'name,slug,content:condition_content ( overview, mealplan_1400, mealplan_1800, mealplan_2200, mealplan_2600, shopping_list, rd_referral, eat_this_not_that ),citations:condition_citations ( id,citation,url,sort_order )'
    )
    .eq('slug', 'ibs')
    .order('sort_order', { referencedTable: 'condition_citations', ascending: true })
    .limit(1)
    .maybeSingle<ConditionRow>()

  console.info('[preview.ibs]', {
    ok: !error && !!data,
    error: error?.message,
  })

  if (error || !data) {
    return null
  }

  return data
}

export default async function IbsPreviewPage() {
  const condition = await fetchIbsContent()

  if (!condition) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6 text-sm text-gray-700">
        <h1 className="text-2xl font-semibold text-gray-900">IBS Handout Preview</h1>
        <p>We’re updating this preview. Please check back soon.</p>
      </main>
    )
  }

  const content = condition.content?.[0] ?? null
  const mealPlanKeys = ['mealplan_1400', 'mealplan_1800'] as const

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-gray-900">IBS Handout Preview</h1>
        <p className="text-sm text-gray-700">
          Explore a limited demo of Nutrition Reference PRO. Sign in to customize handouts, export PDFs, and manage your clinic branding.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
        {content?.overview ? (
          <div className="prose prose-sm max-w-none text-gray-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.overview}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-gray-700">Overview content will appear here.</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {mealPlanKeys.map((key) => (
          <div key={key} className="space-y-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">{key.replace('_', ' ').toUpperCase()}</h3>
            {content?.[key] ? (
              <div className="prose prose-sm max-w-none text-gray-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content[key] ?? ''}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-gray-700">Meal plan details are available in the full product.</p>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Why Upgrade?</h2>
        <ul className="list-disc space-y-2 px-5 text-sm text-gray-700">
          <li>Export branded PDF handouts instantly for your patients.</li>
          <li>Customize clinic branding with your logo and footer messaging.</li>
          <li>Access practitioner notes and curated meal plans for every condition.</li>
        </ul>
        <a
          className="inline-flex w-full justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          href="/sign-up"
        >
          See Pricing &amp; Sign Up
        </a>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Evidence &amp; Citations</h2>
        {condition.citations && condition.citations.length > 0 ? (
          <ol className="space-y-2 text-sm text-gray-800">
            {condition.citations.map((citation) => (
              <li key={citation.id}>
                {citation.url ? (
                  <a className="text-blue-600 hover:underline" href={citation.url} target="_blank" rel="noreferrer">
                    {citation.citation}
                  </a>
                ) : (
                  citation.citation
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-700">Citations are available to subscribers.</p>
        )}
      </section>
    </main>
  )
}
