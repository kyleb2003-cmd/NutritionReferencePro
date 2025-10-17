'use client'

import type { ReactElement, ReactNode } from 'react'
import { Component, useEffect } from 'react'
import { PDFViewer, type DocumentProps } from '@react-pdf/renderer'

class PDFErrorBoundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state = { err: undefined as Error | undefined }

  static getDerivedStateFromError(err: Error) {
    return { err }
  }

  componentDidCatch(err: Error) {
    console.error('PDF render error:', err)
  }

  render() {
    if (this.state.err) {
      return (
        <div className="p-4 text-sm text-red-700">
          Sorry, the PDF preview failed to render. Check the console for details.
        </div>
      )
    }

    return this.props.children
  }
}

export default function HandoutPreviewModal(props: {
  open: boolean
  document: ReactElement<DocumentProps> | null
  filename: string
  onClose: () => void
  onOpen: () => Promise<void> | void
  opening: boolean
}) {
  const { open, document, onClose, onOpen, opening, filename } = props

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
            <p className="text-xs text-gray-700">{filename}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpen}
              disabled={opening}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:opacity-60"
            >
              {opening ? 'Opening…' : 'Open in new tab for printing'}
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
          <PDFErrorBoundary>
            <PDFViewer showToolbar width="100%" height="100%">
              {document}
            </PDFViewer>
          </PDFErrorBoundary>
        </div>
      </div>
    </div>
  )
}
