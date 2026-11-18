import { useEffect } from 'react'
import type { IntakeRefusals } from './draft-files'
import { isFolderEntry, type DroppedFolderEntry } from './folder-entries'
import { zipFolder } from './folder-zip'

/**
 * Whether a drag carries files. Until the drop, the browser shows only the
 * kinds of the items, not the files.
 */
export function carriesFiles(data: DataTransfer | null): boolean {
  if (data === null) return false
  return (
    data.types.includes('Files') ||
    Array.from(data.items).some((item) => item.kind === 'file')
  )
}

/** One item of a drop: a file, or a folder with its entry. */
export type DroppedItem =
  { kind: 'file'; file: File } | { kind: 'folder'; entry: DroppedFolderEntry }

/**
 * The files and the folders of a drop, in their order. A browser gives a
 * dropped folder as an item of kind file whose entry is a directory, so the
 * size or the type of its file cannot tell it from an empty file. A browser
 * that gives no entry gives each item as a file. The items are readable
 * only while the drop event runs, but a folder entry stays readable after.
 */
export function droppedItems(data: DataTransfer | null): DroppedItem[] {
  const dropped: DroppedItem[] = []
  for (const item of Array.from(data?.items ?? [])) {
    if (item.kind !== 'file') continue
    const entry =
      typeof item.webkitGetAsEntry === 'function'
        ? item.webkitGetAsEntry()
        : null
    const file = item.getAsFile()
    if (isFolderEntry(entry)) dropped.push({ kind: 'folder', entry })
    else if (file !== null) dropped.push({ kind: 'file', file })
  }
  return dropped
}

/** The files of a drop to attach, and the folders that it refused. */
export interface DropIntake {
  files: File[]
  refusals: IntakeRefusals
}

/** Whether a drop holds a folder, which must zip before the attach. */
export function holdsFolder(items: readonly DroppedItem[]): boolean {
  return items.some((item) => item.kind === 'folder')
}

/**
 * The intake of a drop. Each folder becomes its zip, at its place among the
 * files, so a drop of a folder attaches one file. The folders zip one after
 * another, so only one zip grows at a time. A folder whose
 * zip passes the size limit, or that the browser cannot read, goes to the
 * refusals. A stopped signal throws `ZipStopped`.
 */
export async function intakeOf(
  items: readonly DroppedItem[],
  signal: AbortSignal,
): Promise<DropIntake> {
  const files: File[] = []
  const tooLarge: string[] = []
  const folders: string[] = []
  for (const item of items) {
    if (item.kind === 'file') {
      files.push(item.file)
      continue
    }
    const zip = await zipFolder(item.entry, signal)
    if (zip.state === 'zipped') files.push(zip.file)
    else if (zip.state === 'too-large') tooLarge.push(zip.name)
    else folders.push(zip.name)
  }
  return { files, refusals: { tooLarge, folders } }
}

/**
 * Keeps a drop of files outside each message box and its drop area from
 * leaving the page. A
 * browser opens a file that the page does not take in place of the page,
 * and the drafts live only in memory. The guard hears each drag last, when
 * it bubbles to the window. A part that takes a drop of files, such as a
 * message box or the Feedback dialog, cancels its events first, and the
 * guard then leaves them alone. Elsewhere it cancels a drag of files, so
 * the pointer shows that a drop does nothing, and it cancels their drop. It
 * never stops an event, and a drag of text or of a link keeps the action of
 * the browser.
 */
export function useFileDropGuard(): void {
  useEffect(() => {
    const over = (event: DragEvent) => {
      if (event.defaultPrevented || !carriesFiles(event.dataTransfer)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
    }
    const drop = (event: DragEvent) => {
      if (event.defaultPrevented || !carriesFiles(event.dataTransfer)) return
      event.preventDefault()
    }
    window.addEventListener('dragenter', over)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', over)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])
}
