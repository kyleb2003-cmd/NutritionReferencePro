import { redirect } from 'next/navigation'

type SearchParams = Promise<{
  session_id?: string | string[]
  state?: string | string[]
}>

export default async function PostCheckoutRedirect({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const sessionParam = Array.isArray(sp.session_id) ? sp.session_id[0] ?? '' : sp.session_id ?? ''
  const stateParam = Array.isArray(sp.state) ? sp.state[0] ?? '' : sp.state ?? ''

  let target = '/post-checkout/password'
  if (stateParam) {
    target += `?state=${encodeURIComponent(stateParam)}`
  } else if (sessionParam) {
    target += `?session_id=${encodeURIComponent(sessionParam)}`
  }
  redirect(target)
}
