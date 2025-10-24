'use client'

import { useState, useTransition } from 'react'
import { setPasswordAction } from './actions'

export default function PasswordForm({ email, state }: { email: string; state: string }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const disabled = pending || pw.length < 8 || pw !== pw2

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setErr(null)
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
          const res = await setPasswordAction(fd)
          if (res?.ok === false) setErr(res.message || 'Something went wrong')
        })
      }}
      className="max-w-md space-y-4"
    >
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="state" value={state} />
      <div className="space-y-1">
        <label className="block text-sm font-medium">New password</label>
        <input
          type="password"
          name="password"
          minLength={8}
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium">Confirm password</label>
        <input
          type="password"
          name="confirm"
          minLength={8}
          required
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {pw && pw2 && pw !== pw2 ? <p className="text-sm text-red-600">Passwords do not match.</p> : null}
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button type="submit" disabled={disabled} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        Save password &amp; continue
      </button>
    </form>
  )
}
