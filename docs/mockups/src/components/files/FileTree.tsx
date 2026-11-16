import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TreeEntry } from '../../fixtures/files'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { changeIcon } from '../../entries/components/files/ChangeIcon.mockup'
import { entryIcon } from '../../entries/components/files/fileIcons.mockup'
import { defined } from '../../defined'
import { instanceKey } from '../../instanceKey'
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
 * The path of each entry of the tree, from the names of the folders above
 * it. Two entries of one folder never share a name, so the path stays the
 * key of an entry when the entries around it change.
 */
function entryPaths(entries: readonly TreeEntry[]): string[] {
  const folders: string[] = []
  return entries.map((entry) => {
    folders.length = entry.depth
    if (entry.folder) folders.push(entry.name)
    return [...folders.slice(0, entry.depth), entry.name].join('/')
  })
}

/** A row of the tree. `id` is the instance key of the path of its entry. */
function Row(props: { entry: TreeEntry; id: string; open: boolean }) {
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
  if (!entry.preview) {
    return (
      <div className={styles.row} style={indent}>
        {content}
      </div>
    )
  }
  return (
    <ScreenLink
      aria-current={props.open ? 'page' : undefined}
      className={classes(styles.row, props.open && styles.open)}
      style={indent}
      to={previewPaths[entry.preview]}
    >
      {content}
    </ScreenLink>
  )
}

/**
 * Every file of the workspace branch, as a tree. A file opens as a tab in
 * the centre column, and the row of the open file is marked.
 */
export function FileTree(props: {
  entries: readonly TreeEntry[]
  open?: TreeEntry['preview']
}) {
  const paths = entryPaths(props.entries)
  return (
    <ul aria-label="All files" className={styles.tree}>
      {props.entries.map((entry, index) => (
        <li key={index}>
          <Row
            entry={entry}
            id={instanceKey(paths[index] ?? entry.name)}
            open={entry.preview !== undefined && entry.preview === props.open}
          />
        </li>
      ))}
    </ul>
  )
}
