import { mentionText } from '../shared/mention-text'
import type { ApiError } from './api/client'
import { failSent, uploadingFile, type DraftFile } from './draft-files'
import { draftParts, draftText } from './draft-marks'

/** Files with chips, and files kept for undo until this draft ends. */
export interface DraftFileState {
  files: readonly DraftFile[]
  detached: readonly DraftFile[]
}

/** An expired sent file stays failed even if its chip left during Send. */
export function failSentDraft(
  state: DraftFileState,
  sentIds: readonly string[],
  error: ApiError,
): DraftFileState {
  return {
    files: failSent(state.files, sentIds, error),
    detached: failSent(state.detached, sentIds, error),
  }
}

/** Each marked file once, in the order of its first chip. */
export function markedFiles(
  text: string,
  files: readonly DraftFile[],
): DraftFile[] {
  const held = new Map(files.map((item) => [item.id, item]))
  const ordered: DraftFile[] = []
  for (const part of draftParts(text)) {
    if (part.kind !== 'file') continue
    const item = held.get(part.id)
    if (item) ordered.push(item)
    held.delete(part.id)
  }
  return ordered
}

/**
 * Reconciles a field change without discarding bytes needed by undo. A
 * stopped upload that comes back starts again from its kept upload, so it
 * sends only the parts with no receipt.
 */
export function reconcileFiles(
  state: DraftFileState,
  text: string,
): DraftFileState {
  const held = [...state.files, ...state.detached]
  const attached = new Set(state.files.map(({ id }) => id))
  const files = markedFiles(text, held).map((item) =>
    !attached.has(item.id) && item.state === 'uploading'
      ? uploadingFile(item.id, item.file, item.upload)
      : item,
  )
  const marked = new Set(files.map(({ id }) => id))
  return { files, detached: held.filter(({ id }) => !marked.has(id)) }
}

/** Removes only the listed marks, keeping literal characters escaped. */
export function withoutFileMarks(text: string, ids: readonly string[]): string {
  const parts = draftParts(text)
  const kept = parts.filter(
    (part) => part.kind !== 'file' || !ids.includes(part.id),
  )
  return kept.length === parts.length ? text : draftText(kept)
}

/** Public message text has decoded words and the returned path at each mark. */
export function messageText(text: string, files: readonly DraftFile[]): string {
  const held = new Map(files.map((item) => [item.id, item]))
  return draftParts(text)
    .map((part) => {
      if (part.kind === 'text') return part.text
      const item = held.get(part.id)
      return item?.state === 'ready' && item.attachment.path !== null
        ? mentionText(item.attachment.path, false)
        : ''
    })
    .join('')
}
