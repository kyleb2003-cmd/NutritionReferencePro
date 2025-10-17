import { pdf, type DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function downloadPdf(doc: ReactElement<DocumentProps>, filename: string) {
  const instance = pdf(doc)
  const blob = await instance.toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function openPdfInNewTab(doc: ReactElement<DocumentProps>, filename: string) {
  const instance = pdf(doc)
  const blob = await instance.toBlob()
  const url = URL.createObjectURL(blob)
  const tab = window.open(url, '_blank', 'noopener,noreferrer')
  if (!tab) {
    // Fallback to download when the popup is blocked.
    await downloadPdf(doc, filename)
    return
  }
  tab.opener = null
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 60_000)
}
