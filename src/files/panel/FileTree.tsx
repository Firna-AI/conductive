import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'
import type { TreeRow } from '../model/tree-rows'
import type { FileMode, FilesNavigation, FileTab } from '../navigation'
import { ChangeIcon } from '../ui/ChangeIcon'
import { FilesLink } from '../ui/FilesLink'
import { classes } from '../ui/classes'
import { focusClass } from '../ui/layout'
import { FileIcon } from './file-icons'
import type { MenuRow, RowMenuItems } from './row-menu'
import { useRowMenu } from './useRowMenu'
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
 * A row of the tree as its menu reads it. A folder that the tree lacks
 * hides a secret value when the label that names it hides one, as
 * `TreeRow` says.
 */
function menuRowOf(row: TreeRow): MenuRow {
  const { entry } = row
  const { path, kind, change } = entry
  return {
    path,
    name: entry.name,
    target: row.hidesSecret ? null : { path, kind, change },
  }
}

/**
 * Every file of the branch, as a tree. A folder opens and closes. A file
 * row is a link to its file tab, and the row of the open file is marked. A
 * double-click on a file row keeps the tab that the row opens. The row of
 * `revealed`, a folder that a press on its chip showed, scrolls into view.
 * Each file row and folder row opens the menu of `rowMenu`, as
 * `useRowMenu` says, and keeps the fill of a hover while it is open.
 */
export function FileTree(props: {
  rows: readonly TreeRow[]
  openPath: string | null
  /** The mode of the open file tab, so its link keeps that mode. */
  openMode: FileMode
  navigation: FilesNavigation
  onFolder: (path: string, open: boolean) => void
  revealed?: { path: string; count: number } | null
  /** The items of the menu of each row. Without it, no row has a menu. */
  rowMenu?: RowMenuItems
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
  const menuRows = props.rows.map(menuRowOf)
  const menu = useRowMenu(props.rowMenu, menuRows)
  return (
    <>
      <ul aria-label="All files" className={styles.tree}>
        {props.rows.map((row, index) => {
          const { entry } = row
          const indent = { paddingLeft: 6 + row.depth * 14 }
          const open = entry.path === props.openPath
          const bound = menu.bind(menuRows[index])
          const className = classes(
            styles.row,
            bound.className,
            bound.open && styles.menuOpen,
          )
          const tab: FileTab = {
            kind: 'file',
            path: entry.path,
            mode: open ? props.openMode : 'preview',
          }
          return (
            <li key={entry.path} ref={keep(entry.path)}>
              {entry.kind === 'directory' ? (
                <button
                  {...bound.handlers}
                  aria-expanded={row.expanded}
                  className={classes(className, focusClass)}
                  onClick={() => props.onFolder(entry.path, !row.expanded)}
                  ref={bound.ref}
                  style={indent}
                  type="button"
                >
                  <RowContent row={row} />
                </button>
              ) : (
                <FilesLink
                  {...bound.handlers}
                  aria-current={open ? 'page' : undefined}
                  className={classes(className, open && styles.open)}
                  navigation={props.navigation}
                  onDoubleClick={() => props.navigation.keep(tab)}
                  ref={bound.ref}
                  style={indent}
                  to={tab}
                >
                  <RowContent row={row} />
                </FilesLink>
              )}
            </li>
          )
        })}
      </ul>
      {menu.layer}
    </>
  )
}
