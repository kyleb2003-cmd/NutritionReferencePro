import type { Metadata } from 'next'
import DietGuidesView from '@/components/DietGuidesView'
import { dietGuides } from '@/content/diets'

export const metadata: Metadata = {
  title: 'Therapeutic Diet Guides',
  description:
    'Search practical therapeutic diet guides, review practitioner notes, and generate branded patient handouts.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function DietsPage() {
  return <DietGuidesView guides={dietGuides} />
}
