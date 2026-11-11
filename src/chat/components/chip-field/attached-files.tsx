import { createContext, useContext, type ReactNode } from 'react'
import type { ChipFile } from '../../../../docs/mockups/src/components/chat/attachedFileParts'
import type { ChipUpload } from '../../../../docs/mockups/src/components/chat/DraftFileChip'
import type { DraftFile } from '../../../app/draft-files'
import { attachmentForMention } from '../../../shared/attachment-mentions'
import { mentionText, type Mention } from '../../../shared/mention-text'
import type { FieldPart } from './field-text'

/**
 * Where the field finds the attached files of its draft, as the owner of the
 * draft gives them. Each method reads the state of the owner at the time of
 * the call, not the props of the last render. So a pick can attach its files
 * and put their chips into the text in the same event, before React renders.
 */
export interface FieldFiles {
  /**
   * Each file that the draft holds now: each attached file, and each file
   * whose chip left the text, which undo or a paste can bring back. A file
   * keeps the same object until it changes, as in a store of immutable
   * state, because its chip redraws when the object changes.
   */
  files(): readonly DraftFile[]
  /** Uploads a failed file again, with the same ID. */
  retry(id: string): void
  /** Calls `listener` after each change of `files()`. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void
}

const FilesContext = createContext<FieldFiles | null>(null)

/** Gives the chips and the plugins of a field the files of its draft. */
export function FieldFilesProvider(props: {
  files: FieldFiles | null
  children: ReactNode
}) {
  return <FilesContext value={props.files}>{props.children}</FilesContext>
}

/** The files of the draft of the field, or null in a field that takes none. */
export function useFieldFiles(): FieldFiles | null {
  return useContext(FilesContext)
}

/** The file of a draft ID that the draft holds now, or undefined. */
export function heldFile(
  files: FieldFiles | null,
  id: string,
): DraftFile | undefined {
  return files?.files().find((item) => item.id === id)
}

/** The ready file of the draft whose copy path a mention names. */
export function fileOfMention(
  held: readonly DraftFile[],
  mention: Mention,
): DraftFile | undefined {
  const ready = held.flatMap((item) =>
    item.state === 'ready' ? [item.attachment] : [],
  )
  const attachment = attachmentForMention(mention, ready)
  return held.find(
    (item) => item.state === 'ready' && item.attachment === attachment,
  )
}

/** The original name of the file, which its chip shows. */
export function nameOf(item: DraftFile): string {
  return item.state === 'ready' ? item.attachment.name : item.file.name
}

/**
 * What the chip shows of the file. Before the upload is ready, the kind
 * comes from the media type of the file, as the upload decides it.
 */
export function chipFileOf(item: DraftFile): ChipFile {
  if (item.state === 'ready') {
    const { name, kind, sizeBytes } = item.attachment
    return { name, kind, sizeBytes }
  }
  const kind = item.file.type.startsWith('image/') ? 'image' : 'file'
  return { name: item.file.name, kind, sizeBytes: item.file.size }
}

/** The upload of the file, as its chip shows it. */
export function chipUploadOf(item: DraftFile): ChipUpload {
  switch (item.state) {
    case 'ready':
      return { state: 'ready' }
    case 'uploading':
      return { state: 'uploading', sentBytes: item.sentBytes }
    case 'failed':
      return { state: 'failed' }
  }
}

/**
 * What a copy of the chip gives: the mention of the copy path of a ready
 * file, with the spaces of a mention, or else the name of the file. A chip
 * whose file the draft no longer holds gives nothing.
 */
export function copyPartOf(item: DraftFile | undefined): FieldPart | null {
  if (item === undefined) return null
  if (item.state === 'ready' && item.attachment.path !== null) {
    const source = mentionText(item.attachment.path, false)
    return { kind: 'chip', source, mention: true }
  }
  return { kind: 'text', text: nameOf(item) }
}
