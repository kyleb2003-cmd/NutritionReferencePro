import type { ReactElement } from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

export type PDFSection = { label: string; text?: string | null }

const PAGE_PADDING = 28
const HEADER_H = 84
const FOOTER_H = 64

const styles = StyleSheet.create({
  page: {
    fontSize: 11.5,
    lineHeight: 1.55,
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingLeft: PAGE_PADDING,
    paddingRight: PAGE_PADDING,
  },
  header: {
    position: 'absolute',
    top: PAGE_PADDING,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logo: { width: 64, height: 64, objectFit: 'contain' },
  titleWrap: { flexGrow: 1 },
  clinicName: { fontSize: 14, fontWeight: 700, color: '#111827' },
  appName: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  condition: { fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 4 },
  meta: { fontSize: 10, color: '#374151', marginTop: 2 },
  content: {
    marginTop: HEADER_H + 12,
    marginBottom: FOOTER_H + 12,
    flexDirection: 'column',
    gap: 18,
  },
  sectionBlock: {
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 },
  paragraph: { fontSize: 11.5, color: '#1F2937', lineHeight: 1.55, marginBottom: 6 },
  list: { marginLeft: 14, gap: 4, color: '#1F2937' },
  listItem: { flexDirection: 'row', gap: 6 },
  listBullet: { width: 12, fontWeight: 700 },
  listText: { flex: 1, fontSize: 11.5, lineHeight: 1.6 },
  footer: {
    position: 'absolute',
    bottom: PAGE_PADDING,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    fontSize: 9.5,
    color: '#1F2937',
  },
  footerLeft: { flexGrow: 1, gap: 2 },
  footerRight: { textAlign: 'right' },
})

type MarkdownBlock =
  | { type: 'heading'; depth: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: { bullet: string; text: string }[] }

function buildSections(sections: PDFSection[]): { label: string; text: string }[] {
  return sections
    .map(({ label, text }) => ({
      label,
      text: (text ?? '').replace(/\r\n/g, '\n').trim(),
    }))
    .filter((section) => section.text.length > 0)
}

function parseMarkdown(text?: string | null): MarkdownBlock[] {
  if (!text) return []
  const blocks: MarkdownBlock[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  let paragraph: string[] = []
  let list: { ordered: boolean; items: { bullet: string; text: string }[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
      paragraph = []
    }
  }

  const flushList = () => {
    if (list && list.items.length > 0) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items })
    }
    list = null
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      return
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const depth = headingMatch[1].length as 1 | 2 | 3
      const textContent = headingMatch[2].trim()
      blocks.push({ type: 'heading', depth, text: textContent })
      return
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      flushParagraph()
      const textContent = bulletMatch[1].trim()
      if (!list) {
        list = { ordered: false, items: [] }
      }
      if (!list.ordered) {
        list.items.push({ bullet: '•', text: textContent })
      } else {
        list.items.push({ bullet: String(list.items.length + 1) + '.', text: textContent })
      }
      return
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph()
      const textContent = orderedMatch[2].trim()
      const bullet = `${orderedMatch[1]}.`
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push({ bullet, text: textContent })
      return
    }

    flushList()
    paragraph.push(rawLine.trimEnd())
  })

  flushParagraph()
  flushList()

  return blocks
}

function renderMarkdownBlocks(blocks: MarkdownBlock[]): ReactElement[] {
  return blocks
    .map((block, index) => {
      if (block.type === 'list') {
        return (
          <View key={`list-${index}`} style={styles.list}>
            {block.items.map((item, idx) => (
              <View key={`list-${index}-${idx}`} style={styles.listItem}>
                <Text style={styles.listBullet}>{item.bullet}</Text>
                <Text style={styles.listText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )
      }

      const text = block.text.trim()
      if (!text) return null

      return (
        <Text key={`paragraph-${index}`} style={styles.paragraph}>
          {text}
        </Text>
      )
    })
    .filter(Boolean) as ReactElement[]
}

export default function HandoutPDF(props: {
  clinicName?: string
  footerText?: string
  logoDataUrl?: string | null
  conditionName: string
  patientName: string
  printedOn: string
  sections: PDFSection[]
}) {
  const { clinicName, footerText, logoDataUrl, conditionName, patientName, printedOn, sections } = props
  const printableSections = buildSections(sections)
  const footerLines = [`Generated by Nutrition Reference Pro • Printed on: ${printedOn}`].concat(
    footerText?.trim() ? [footerText.trim()] : [],
  )

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed>
          {logoDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.logo} src={logoDataUrl} />
          ) : null}
          <View style={styles.titleWrap}>
            {clinicName ? <Text style={styles.clinicName}>{clinicName}</Text> : null}
            <Text style={styles.appName}>Nutrition Reference Pro</Text>
            <Text style={styles.condition}>{conditionName}</Text>
            <Text style={styles.meta}>Patient: {patientName} · Printed on: {printedOn}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            {footerLines.map((line, idx) => (
              <Text key={`footer-${idx}`}>{line}</Text>
            ))}
          </View>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

        <View style={styles.content}>
          {printableSections.map((section, index) => (
            <View key={`${section.label}-${index}`} style={styles.sectionBlock} break={index > 0}>
              <Text style={styles.sectionTitle}>{section.label}</Text>
              {renderMarkdownBlocks(parseMarkdown(section.text))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
