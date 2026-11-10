import { File, FileCode, FileText, Folder, FolderOpen } from 'lucide-react'
import {
  fileKind,
  type FileKind,
} from '../../../../../src/files/code/file-kind'

const kindIcons: Record<FileKind, typeof File> = {
  markdown: FileText,
  code: FileCode,
  file: File,
}

/**
 * The icon of an entry of the tree, as All files draws it: a folder, open
 * or closed, a Markdown file, a code file, or another file. It is the one
 * icon map of the mockups and the app. A file is code when the code view of
 * the app gives it syntax colours.
 */
export function EntryIcon(props: {
  name: string
  folder: boolean
  open?: boolean
  size: number
  className?: string
}) {
  const icon = {
    'aria-hidden': true,
    className: props.className,
    size: props.size,
  }
  if (props.folder) {
    return props.open ? <FolderOpen {...icon} /> : <Folder {...icon} />
  }
  const Icon = kindIcons[fileKind(props.name)]
  return <Icon {...icon} />
}
