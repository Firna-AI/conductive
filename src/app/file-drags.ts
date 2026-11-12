import { useEffect } from 'react'

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

/** The files and the folders of a drop, each in their order. */
export interface DroppedItems {
  files: File[]
  /** The name of each dropped folder. */
  folders: string[]
}

/**
 * Splits a drop into its files and the names of its folders. A browser
 * gives a dropped folder as an item of kind file whose entry is a
 * directory, so the size or the type of its file cannot tell it from an
 * empty file. A browser that gives no entry gives each item as a file. The
 * items are readable only while the drop event runs.
 */
export function droppedItems(data: DataTransfer | null): DroppedItems {
  const dropped: DroppedItems = { files: [], folders: [] }
  for (const item of Array.from(data?.items ?? [])) {
    if (item.kind !== 'file') continue
    const entry =
      typeof item.webkitGetAsEntry === 'function'
        ? item.webkitGetAsEntry()
        : null
    const file = item.getAsFile()
    if (entry?.isDirectory) dropped.folders.push(entry.name)
    else if (file !== null) dropped.files.push(file)
  }
  return dropped
}

/**
 * Keeps a drop of files outside each message box from leaving the page. A
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
