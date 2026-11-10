import { useEffect, useRef } from 'react'

/**
 * The files of a paste when it holds files and no plain text, such as a
 * screenshot that the person copied. A paste with plain text stays a paste
 * of text, also when the clipboard holds a picture of that text too, as a
 * spreadsheet gives it.
 */
export function pastedFiles(data: DataTransfer | null): File[] {
  if (data === null || data.getData('text/plain') !== '') return []
  return Array.from(data.files)
}

/**
 * Whether a drag carries files. Until the drop, the browser shows only the
 * kinds of the items, not the files.
 */
function carriesFiles(data: DataTransfer | null): boolean {
  if (data === null) return false
  return (
    data.types.includes('Files') ||
    Array.from(data.items).some((item) => item.kind === 'file')
  )
}

/**
 * While the Feedback dialog shows, a drop of files on the window adds them
 * as screenshots. The dialog is modal, so the page under it takes no drop,
 * and the browser does not open the files, which would leave the page and
 * lose the draft. While a send runs, a drop does nothing. The listeners
 * hear the capture phase, so the message field does not take the drop.
 */
export function useScreenshotDrop(
  accepts: boolean,
  add: (files: File[]) => void,
): void {
  const latest = useRef({ accepts, add })
  useEffect(() => {
    latest.current = { accepts, add }
  })
  useEffect(() => {
    const over = (event: DragEvent) => {
      const data = event.dataTransfer
      if (!carriesFiles(data)) return
      event.preventDefault()
      if (data) data.dropEffect = latest.current.accepts ? 'copy' : 'none'
    }
    const drop = (event: DragEvent) => {
      const data = event.dataTransfer
      if (!carriesFiles(data)) return
      event.preventDefault()
      event.stopPropagation()
      const files = Array.from(data?.files ?? [])
      if (latest.current.accepts && files.length > 0) latest.current.add(files)
    }
    document.addEventListener('dragenter', over, true)
    document.addEventListener('dragover', over, true)
    document.addEventListener('drop', drop, true)
    return () => {
      document.removeEventListener('dragenter', over, true)
      document.removeEventListener('dragover', over, true)
      document.removeEventListener('drop', drop, true)
    }
  }, [])
}
