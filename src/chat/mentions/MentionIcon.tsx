import { Folder } from 'lucide-react'
import { FileIcon } from '../../files/panel/file-icons'
import type { FileEntry } from '../../shared/files'

/**
 * The icon of an entry in the list of `@` and on its chip: the icon that
 * All files gives it, so a file keeps one icon everywhere.
 */
export function MentionIcon(props: { entry: FileEntry; size: number }) {
  const { entry, size } = props
  if (entry.kind === 'directory') return <Folder aria-hidden size={size} />
  return <FileIcon path={entry.path} size={size} />
}
