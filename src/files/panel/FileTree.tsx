import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'
import type { TreeRow } from '../model/tree-rows'
import type { FileMode, FilesNavigation } from '../navigation'
import { ChangeIcon } from '../ui/ChangeIcon'
import { FilesLink } from '../ui/FilesLink'
import { classes } from '../ui/classes'
import { focusClass } from '../ui/layout'
import { FileIcon } from './file-icons'
import styles from './FileTree.module.css'

function RowContent(props: { row: TreeRow }) {
  const { entry, expanded } = props.row
  const icon = { 'aria-hidden': true, className: styles.icon, size: 14 }
  const chevron = { 'aria-hidden': true, className: styles.chevron, size: 14 }
  let leading = (
    <>
      <span className={styles.spacer} />
      <FileIcon className={styles.icon} path={entry.path} size={14} />
    </>
  )
  if (entry.kind === 'directory') {
    leading = expanded ? (
      <>
        <ChevronDown {...chevron} />
        <FolderOpen {...icon} />
      </>
    ) : (
      <>
        <ChevronRight {...chevron} />
        <Folder {...icon} />
      </>
    )
  }
  return (
    <>
      {leading}
      <span className={styles.name}>{entry.name}</span>
      {entry.change ? <ChangeIcon change={entry.change} /> : null}
    </>
  )
}

/**
 * Every file of the branch, as a tree. A folder opens and closes. A file
 * row is a link to its file tab, and the row of the open file is marked.
 * The row of `revealed`, a folder that a press on its chip showed, scrolls
 * into view.
 */
export function FileTree(props: {
  rows: readonly TreeRow[]
  openPath: string | null
  /** The mode of the open file tab, so its link keeps that mode. */
  openMode: FileMode
  navigation: FilesNavigation
  onFolder: (path: string, open: boolean) => void
  revealed?: { path: string; count: number } | null
}) {
  // The row of each path, so a revealed folder can scroll into view. The
  // markup holds no real path, because a real path can hold a secret value.
  const rowsByPath = useRef(new Map<string, HTMLLIElement>())
  const { revealed } = props
  useEffect(() => {
    if (!revealed) return
    const row = rowsByPath.current.get(revealed.path)
    row?.scrollIntoView?.({ block: 'nearest' })
  }, [revealed])
  const keep = (path: string) => (row: HTMLLIElement | null) => {
    if (row) rowsByPath.current.set(path, row)
    else rowsByPath.current.delete(path)
  }
  return (
    <ul aria-label="All files" className={styles.tree}>
      {props.rows.map((row) => {
        const { entry } = row
        const indent = { paddingLeft: 6 + row.depth * 14 }
        const open = entry.path === props.openPath
        return (
          <li key={entry.path} ref={keep(entry.path)}>
            {entry.kind === 'directory' ? (
              <button
                aria-expanded={row.expanded}
                className={classes(styles.row, focusClass)}
                onClick={() => props.onFolder(entry.path, !row.expanded)}
                style={indent}
                type="button"
              >
                <RowContent row={row} />
              </button>
            ) : (
              <FilesLink
                aria-current={open ? 'page' : undefined}
                className={classes(styles.row, open && styles.open)}
                navigation={props.navigation}
                style={indent}
                to={{
                  kind: 'file',
                  path: entry.path,
                  mode: open ? props.openMode : 'preview',
                }}
              >
                <RowContent row={row} />
              </FilesLink>
            )}
          </li>
        )
      })}
    </ul>
  )
}
