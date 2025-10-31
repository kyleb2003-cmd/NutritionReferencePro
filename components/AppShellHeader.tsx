import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

type NavKey = 'dashboard' | 'diets' | 'branding'

const navItems: Array<{ key: NavKey; href: string; label: string }> = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { key: 'diets', href: '/diets', label: 'Therapeutic Diet Guides' },
  { key: 'branding', href: '/dashboard/branding', label: 'Branding' },
]

export default function AppShellHeader({ active }: { active: NavKey }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-gray-900 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Nutrition Reference Pro
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-gray-800 md:flex">
            {navItems.map((item) => {
              const isActive = item.key === active
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center rounded-md px-2 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 ${
                    isActive ? 'text-gray-900 underline' : 'hover:underline'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <SignOutButton />
      </div>
    </header>
  )
}
