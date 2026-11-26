import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TreeEntry } from '../../fixtures/files'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../../../../../src/ui/components/common/classes'
import { changeIcon } from '../../entries/components/files/ChangeIcon.mockup'
import { entryIcon } from '../../entries/components/files/fileIcons.mockup'
import { defined } from '../../defined'
import { instanceKey } from '../../instanceKey'
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
 * `id` is the instance key of the path of its entry. A Markdown file leads
 * to `markdownTo`, and each other file to the tab of its kind.
 */
function Row(props: {
  entry: TreeEntry
  id: string
  open: boolean
  menuOpen: boolean
  markdownTo: string
}) {
  const { entry } = props
  const content = (
    <>
      <Disclosure entry={entry} />
      <entryIcon.Component
        className={styles.icon}
        folder={entry.folder}
        moklyInstance={`icon-${props.id}`}
        name={entry.name}
        size={14}
        {...defined({ open: entry.open })}
      />
      <span className={styles.name}>{entry.name}</span>
      {entry.change ? (
        <changeIcon.Component
          change={entry.change}
          moklyInstance={`change-${props.id}`}
        />
      ) : null}
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
      to={
        entry.preview === 'markdown'
          ? props.markdownTo
          : previewPaths[entry.preview]
      }
    >
      {content}
    </ScreenLink>
  )
}

/**
 * The path of each entry from the root of the repository, from the names of
 * the folders above it, such as `src/app/checkout`. Two entries of one
 * folder never share a name, so the path stays the key of an entry when the
 * entries around it change.
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
 * the centre column, and the row of the open file is marked. `markdownTo`
 * is the page of the Markdown file, when it differs from its plain
 * preview. `menu` is the open menu of a file or a folder row, at the
 * pointer or under a sheet.
 */
export function FileTree(props: {
  entries: readonly TreeEntry[]
  open?: TreeEntry['preview']
  markdownTo?: string
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
              id={instanceKey(paths[index] ?? entry.name)}
              markdownTo={props.markdownTo ?? previewPaths.markdown}
              menuOpen={menu !== undefined}
              open={entry.preview !== undefined && entry.preview === props.open}
            />
          </RowMenuItem>
        )
      })}
    </ul>
  )
}
