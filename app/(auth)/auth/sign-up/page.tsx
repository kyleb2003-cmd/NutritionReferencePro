import { redirect } from 'next/navigation'

export default function SignUpGuard() {
  redirect('/subscribe')
}
