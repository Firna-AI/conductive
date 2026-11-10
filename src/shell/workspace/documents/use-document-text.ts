import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../app/api/client'
import type { ConductorDocuments } from '../../../app/conductor-documents'
import { saveFromMemory } from '../../../files/page/fetched-download'

/** The Markdown of an old session as the page reads it. */
export type DocumentText =
  | { state: 'loading' }
  | { state: 'ready'; text: string }
  | { state: 'failed'; status: number }

/** The last result of Copy or Download, which the header shows. */
export type DocumentStatus = 'copied' | 'copy-failed' | null

/** How long the header shows that the text was copied, in ms. */
const copiedMs = 2_000

/**
 * Reads the Markdown of one old session from the routes of the app, and
 * reads it again at Try again. A reply for a document that the page left
 * never shows, because the page stops its read.
 */
export function useDocumentText(
  documents: ConductorDocuments,
  documentId: string,
): { text: DocumentText; retry: () => void } {
  const [read, setRead] = useState<{ key: string; text: DocumentText }>({
    key: '',
    text: { state: 'loading' },
  })
  const [attempt, setAttempt] = useState(0)
  const key = `${documentId}:${attempt}`
  useEffect(() => {
    const stop = new AbortController()
    documents.read(documentId, stop.signal).then(
      (text) => setRead({ key, text: { state: 'ready', text } }),
      (error: unknown) => {
        if (stop.signal.aborted) return
        const status = error instanceof ApiError ? error.status : 0
        setRead({ key, text: { state: 'failed', status } })
      },
    )
    return () => stop.abort()
  }, [documents, documentId, key])
  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  return {
    text: read.key === key ? read.text : { state: 'loading' },
    retry,
  }
}

/**
 * Copy of the Markdown, with the status that the header shows for a short
 * time, and Download, which saves the Markdown that the page holds as a
 * file named after the session.
 */
export function useDocumentActions(name: string) {
  const [status, setStatus] = useState<DocumentStatus>(null)
  useEffect(() => {
    if (status !== 'copied') return
    const timer = setTimeout(() => setStatus(null), copiedMs)
    return () => clearTimeout(timer)
  }, [status])
  const copy = (text: string) => {
    const clipboard =
      typeof navigator === 'undefined' ? undefined : navigator.clipboard
    if (!clipboard) {
      setStatus('copy-failed')
      return
    }
    clipboard.writeText(text).then(
      () => setStatus('copied'),
      () => setStatus('copy-failed'),
    )
  }
  const download = (text: string) => {
    const file = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    saveFromMemory(file, `${name.replaceAll('/', '-')}.md`)
  }
  return { status, copy, download }
}
