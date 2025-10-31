import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Nutrition Reference PRO',
    template: '%s | Nutrition Reference PRO',
  },
  description: 'Evidence-based nutrition handouts and clinic branding built for busy practitioners.',
  openGraph: {
    title: 'Nutrition Reference PRO',
    description: 'Evidence-based nutrition handouts and clinic branding built for busy practitioners.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nutrition Reference PRO',
    description: 'Evidence-based nutrition handouts and clinic branding built for busy practitioners.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.className} ${inter.variable}`}>
      <body className={`${geistMono.variable} antialiased bg-white text-gray-900`}>
        {children}
      </body>
    </html>
  )
}
