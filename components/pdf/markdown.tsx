import type { ReactElement } from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  paragraph: { fontSize: 11, color: '#1F2937', lineHeight: 1.5, marginBottom: 6 },
  list: { marginLeft: 14, gap: 4, color: '#1F2937' },
  listItem: { flexDirection: 'row', gap: 6 },
  listBullet: { width: 12, fontWeight: 700 },
  listText: { flex: 1, fontSize: 11, lineHeight: 1.5 },
})

export type MarkdownBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: { bullet: string; text: string }[] }

export function renderMarkdown(blocks: MarkdownBlock[]): ReactElement[] {
  return (
    blocks
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
  )
}
