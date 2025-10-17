export const runtime = 'nodejs'

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function SentPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams
  const email = params.email as string | undefined
  return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Invoice sent</h1>
      <p className="text-neutral-700">
        We generated an invoice for <strong>{email}</strong>. You’ll be able to set your password and sign in once payment posts.
      </p>
    </main>
  )
}
