import type { MouseEvent } from 'react'
import type { FileEntry } from '../../shared/files'
import { lineLabel, type LineRange } from '../../shared/line-target'
import { isPlainClick } from '../../shell/ui/AppLink'
import type { ChatMentions } from '../mentions/MentionsContext'

/**
 * The link of chat text to a file or a folder: its address, and a plain
 * click that opens the file, at `lines` when it has them, or shows All
 * files with the folder open. A click with a modifier key stays with the
 * browser. The chips of files, of attached files, and the links of files
 * open them so.
 */
export function fileOpener(
  mentions: ChatMentions,
  entry: FileEntry,
  lines: LineRange | null,
): { href: string; onClick: (event: MouseEvent) => void } {
  const at = lines ?? undefined
  return {
    href: mentions.href(entry, at),
    onClick: (event) => {
      if (!isPlainClick(event)) return
      event.preventDefault()
      if (entry.kind === 'directory') mentions.showFolder(entry.path)
      else mentions.openFile(entry.path, at)
    },
  }
}

/** The title of a file or a folder, with the lines that the text names. */
export function fileTitle(entry: FileEntry, lines: LineRange | null): string {
  if (entry.kind === 'directory') return `${entry.path}/`
  return lines ? `${entry.path}:${lineLabel(lines)}` : entry.path
}
