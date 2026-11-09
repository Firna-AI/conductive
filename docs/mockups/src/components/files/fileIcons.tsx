import { File, FileCode, FileText, Folder, FolderOpen } from 'lucide-react'

/**
 * The icon of an entry of the tree, as All files draws it: a folder, open
 * or closed, a code file, a Markdown file, or another file.
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
  if (/\.(tsx?|json)$/.test(props.name)) return <FileCode {...icon} />
  if (props.name.endsWith('.md')) return <FileText {...icon} />
  return <File {...icon} />
}
