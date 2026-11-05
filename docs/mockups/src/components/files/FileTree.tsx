import { MockLink } from '@mokly/mokly'
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-react'
import type { TreeEntry } from '../../fixtures/files'
import { ChangeIcon } from './ChangeIcon'
import { previewPaths } from './previewPaths'
import styles from './FileTree.module.css'

/** The chevron of a folder, or the space where a file has none. */
function Disclosure(props: { entry: TreeEntry }) {
  if (!props.entry.folder) return <span className={styles.spacer} />
  return props.entry.open ? (
    <ChevronDown className={styles.chevron} size={14} />
  ) : (
    <ChevronRight className={styles.chevron} size={14} />
  )
}

function EntryIcon(props: { entry: TreeEntry }) {
  const { entry } = props
  const icon = { className: styles.icon, size: 14 }
  if (entry.folder) {
    return entry.open ? <FolderOpen {...icon} /> : <Folder {...icon} />
  }
  if (/\.(tsx?|json)$/.test(entry.name)) return <FileCode {...icon} />
  if (entry.name.endsWith('.md')) return <FileText {...icon} />
  return <File {...icon} />
}

function Row(props: { entry: TreeEntry }) {
  const { entry } = props
  const content = (
    <>
      <Disclosure entry={entry} />
      <EntryIcon entry={entry} />
      <span className={styles.name}>{entry.name}</span>
      {entry.change ? <ChangeIcon change={entry.change} /> : null}
    </>
  )
  const indent = { paddingLeft: 6 + entry.depth * 14 }
  if (!entry.preview) {
    return (
      <div className={styles.row} style={indent}>
        {content}
      </div>
    )
  }
  return (
    <MockLink
      className={styles.row}
      style={indent}
      to={previewPaths[entry.preview]}
    >
      {content}
    </MockLink>
  )
}

/** Every file of the workspace branch, as a tree. */
export function FileTree(props: { entries: readonly TreeEntry[] }) {
  return (
    <ul aria-label="All files" className={styles.tree}>
      {props.entries.map((entry, index) => (
        <li key={index}>
          <Row entry={entry} />
        </li>
      ))}
    </ul>
  )
}
