'use client'

import type { ReactElement } from 'react'
import { PDFViewer, type DocumentProps } from '@react-pdf/renderer'
import { useEffect } from 'react'

export default function HandoutPreviewModal(props: {
  open: boolean
  document: ReactElement<DocumentProps> | null
  filename: string
  onClose: () => void
  onDownload: () => Promise<void> | void
  downloading: boolean
}) {
  const { open, document, onClose, onDownload, downloading, filename } = props

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !document) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold leading-tight">Handout Preview</h2>
            <p className="text-xs text-gray-500">{filename}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onDownload}
              disabled={downloading}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60"
            >
              {downloading ? 'Downloading…' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100">
          <PDFViewer showToolbar width="100%" height="100%">
            {document}
          </PDFViewer>
        </div>
      </div>
    </div>
  )
}
