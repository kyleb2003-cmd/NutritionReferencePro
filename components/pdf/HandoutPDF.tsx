import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import { renderMarkdown, type MarkdownBlock } from '@/components/pdf/markdown'

const PDF_FONT = 'Helvetica'

export type PDFSection = { label: string; text?: string | null }

const PAGE_PADDING = 28
const HEADER_H = 84
const FOOTER_H = 64

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT,
    fontSize: 11.5,
    lineHeight: 1.5,
    paddingTop: 0,
    paddingBottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 12,
    paddingBottom: 8,
  },
  logo: { width: 64, height: 64, marginRight: 12, objectFit: 'contain' },
  headerTitles: { flexGrow: 1 },
  titleClinic: { fontFamily: PDF_FONT, fontSize: 13, fontWeight: 600, color: '#111827' },
  titleApp: { fontFamily: PDF_FONT, fontSize: 10, color: '#6B7280', marginTop: 1 },
  titleCondition: { fontFamily: PDF_FONT, fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 2 },
  meta: { fontFamily: PDF_FONT, fontSize: 10, color: '#374151', marginTop: 2 },
  content: {
    position: 'relative',
    marginTop: HEADER_H + 12,
    marginBottom: FOOTER_H + 12,
    paddingLeft: PAGE_PADDING,
    paddingRight: PAGE_PADDING,
  },
  sectionBlock: { marginBottom: 16 },
  sectionTitle: { fontFamily: PDF_FONT, fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    height: FOOTER_H,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: { maxWidth: '75%', fontFamily: PDF_FONT, fontSize: 10, color: '#111827' },
  footerRight: { fontFamily: PDF_FONT, fontSize: 10, color: '#111827', textAlign: 'right' },
})

function normalizeSections(sections: PDFSection[]): { label: string; text: string; blocks: MarkdownBlock[] }[] {
  return sections
    .map(({ label, text }) => {
      const clean = (text ?? '').replace(/\r\n/g, '\n').trim()
      return {
        label,
        text: clean,
        blocks: clean ? parseMarkdown(clean) : [],
      }
    })
    .filter((section) => section.text.length > 0 && section.blocks.length > 0)
}

function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const lines = text.split('\n')

  let paragraph: string[] = []
  let list: { ordered: boolean; items: { bullet: string; text: string }[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
      paragraph = []
    }
  }

  const flushList = () => {
    if (list && list.items.length) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items })
    }
    list = null
  }

  lines.forEach((raw) => {
    const line = raw.trim()

    if (!line) {
      flushParagraph()
      flushList()
      return
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', depth: heading[1].length, text: heading[2].trim() })
      return
    }

    const bullet = line.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list.items.push({ bullet: '•', text: bullet[1].trim() })
      return
    }

    const ordered = line.match(/^(\d+)\.\s+(.*)$/)
    if (ordered) {
      flushParagraph()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push({ bullet: `${ordered[1]}.`, text: ordered[2].trim() })
      return
    }

    flushList()
    paragraph.push(raw)
  })

  flushParagraph()
  flushList()

  return blocks
}

export default function HandoutPDF(props: {
  clinicName?: string
  footerText?: string
  logoDataUrl?: string | null
  conditionName: string
  patientName?: string
  printedOn: string
  sections: PDFSection[]
}): ReactElement {
  const { clinicName, footerText, logoDataUrl, conditionName, patientName, printedOn, sections } = props
  const normalized = normalizeSections(sections)

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View fixed style={styles.header}>
          {logoDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={logoDataUrl} />
          ) : null}
          <View style={styles.headerTitles}>
            {clinicName ? <Text style={styles.titleClinic}>{clinicName}</Text> : null}
            <Text style={styles.titleApp}>Nutrition Reference Pro</Text>
            <Text style={styles.titleCondition}>{conditionName}</Text>
            <Text style={styles.meta}>
              {patientName ? `Patient: ${patientName} · ` : ''}Printed on: {printedOn}
            </Text>
          </View>
        </View>

        <View fixed style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text>Generated by Nutrition Reference Pro • Printed on: {printedOn}</Text>
            {footerText?.trim() ? <Text>{footerText.trim()}</Text> : null}
          </View>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

        <View style={styles.content}>
          {normalized.map((section, index) => (
            <View key={`${section.label}-${index}`} break={index > 0} style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{section.label}</Text>
              {renderMarkdown(section.blocks, PDF_FONT)}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
