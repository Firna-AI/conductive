import { FileDiff } from 'lucide-react'
import { EntryIcon } from '../../../docs/mockups/src/components/files/fileIcons'

/**
 * The icon of a file or of its diff. A file takes the icon of the one icon
 * map, `EntryIcon` of the mockups, from the name at the end of its path:
 * Markdown, code, or another file.
 */
export function FileIcon(props: {
  path: string
  diff?: boolean
  className?: string
  size: number
}) {
  if (props.diff) {
    return (
      <FileDiff aria-hidden className={props.className} size={props.size} />
    )
  }
  return (
    <EntryIcon
      className={props.className}
      folder={false}
      name={props.path.slice(props.path.lastIndexOf('/') + 1)}
      size={props.size}
    />
  )
}
