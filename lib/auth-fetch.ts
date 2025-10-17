import { supabase } from '@/lib/supabase-client'

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('You must be signed in to perform this action.')
  }

  const headers = new Headers(init.headers ?? {})
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response
}
