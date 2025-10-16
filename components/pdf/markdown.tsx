import type { ReactElement } from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'

export type MarkdownBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: { bullet: string; text: string }[] }
  | { type: 'heading'; depth: number; text: string }

export function renderMarkdown(blocks: MarkdownBlock[], fontFamily: string): ReactElement[] {
  const styles = StyleSheet.create({
    paragraph: { fontFamily, fontSize: 11.5, lineHeight: 1.5, color: '#111827', marginBottom: 6 },
    list: { marginLeft: 16, gap: 5 },
    listRow: { flexDirection: 'row', gap: 6 },
    bullet: { width: 12, fontFamily, fontSize: 11.5, lineHeight: 1.5, color: '#111827' },
    listText: { flexGrow: 1, fontFamily, fontSize: 11.5, lineHeight: 1.5, color: '#111827' },
    heading: { fontFamily, fontSize: 12.5, fontWeight: 600, color: '#111827', marginBottom: 4 },
  })

  return (
    blocks
      .map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Text key={`heading-${index}`} style={styles.heading}>
              {block.text.trim()}
            </Text>
          )
        }

        if (block.type === 'list') {
          return (
            <View key={`list-${index}`} style={styles.list}>
              {block.items.map((item, idx) => (
                <View key={`list-${index}-${idx}`} style={styles.listRow}>
                  <Text style={styles.bullet}>{item.bullet}</Text>
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
  )
}
