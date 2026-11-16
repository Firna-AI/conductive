import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TreeEntry } from '../../fixtures/files'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { ChangeIcon } from './ChangeIcon'
import { EntryIcon } from './fileIcons'
import { RowMenuItem, type FileRowMenu } from './FileRowMenu'
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

/**
 * One row of the tree. The row of the open file is marked, and the row of
 * an open menu keeps the fill of a hover, as a tab with an open menu does.
 */
function Row(props: { entry: TreeEntry; open: boolean; menuOpen: boolean }) {
  const { entry } = props
  const content = (
    <>
      <Disclosure entry={entry} />
      <EntryIcon
        className={styles.icon}
        folder={entry.folder}
        name={entry.name}
        open={entry.open}
        size={14}
      />
      <span className={styles.name}>{entry.name}</span>
      {entry.change ? <ChangeIcon change={entry.change} /> : null}
    </>
  )
  const indent = { paddingLeft: 6 + entry.depth * 14 }
  const className = classes(
    styles.row,
    props.menuOpen && styles.menuOpen,
    props.open && styles.open,
  )
  if (!entry.preview) {
    return (
      <div className={className} style={indent}>
        {content}
      </div>
    )
  }
  return (
    <ScreenLink
      aria-current={props.open ? 'page' : undefined}
      className={className}
      style={indent}
      to={previewPaths[entry.preview]}
    >
      {content}
    </ScreenLink>
  )
}

/**
 * The path of each entry from the root of the repository, from the names of
 * the folders above it, such as `src/app/checkout`.
 */
function pathsOf(entries: readonly TreeEntry[]): string[] {
  let folders: string[] = []
  return entries.map((entry) => {
    const parents = folders.slice(0, entry.depth)
    folders = entry.folder ? [...parents, entry.name] : parents
    return [...parents, entry.name].join('/')
  })
}

/**
 * Every file of the workspace branch, as a tree. A file opens as a tab in
 * the centre column, and the row of the open file is marked. `menu` is the
 * open menu of a file or a folder row, at the pointer or under a sheet.
 */
export function FileTree(props: {
  entries: readonly TreeEntry[]
  open?: TreeEntry['preview']
  menu?: FileRowMenu
}) {
  const paths = pathsOf(props.entries)
  return (
    <ul aria-label="All files" className={styles.tree}>
      {props.entries.map((entry, index) => {
        const menu = props.menu?.path === paths[index] ? props.menu : undefined
        return (
          <RowMenuItem key={index} menu={menu}>
            <Row
              entry={entry}
              menuOpen={menu !== undefined}
              open={entry.preview !== undefined && entry.preview === props.open}
            />
          </RowMenuItem>
        )
      })}
    </ul>
  )
}
