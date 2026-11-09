import type { ReactNode } from 'react'
import { classes } from '../common/classes'
import { EntryIcon } from '../files/fileIcons'
import { entryFolder, entryName } from './entryPaths'
import { mentionRows } from './fileMentions'
import styles from './FileMentionList.module.css'

/**
 * The file tree as the list of `@` finds it: the latest tree, a tree that
 * still loads, or no tree, because the cloud computer could not read the
 * files and no list was saved before.
 */
export type MentionTree = 'latest' | 'loading' | 'unavailable'

/**
 * The list of `@` above the message box, as wide as the box (decision
 * 214). It shows the files and folders of the kept file tree that match the
 * query: the icon, the name, and the folder of each, as in Conductor. The
 * first row is highlighted, and Enter or Tab picks it. One line takes the
 * place of the rows while the tree loads, when no tree is available, and
 * when nothing matches.
 */
export function FileMentionList(props: { query: string; tree: MentionTree }) {
  const rows = props.tree === 'latest' ? mentionRows(props.query) : []
  let line: ReactNode = null
  if (props.tree === 'loading') line = 'Loading files…'
  else if (props.tree === 'unavailable') {
    line = 'The list of all files is unavailable'
  } else if (rows.length === 0) line = `Nothing matches “${props.query}”`
  return (
    <div
      aria-label="Files and folders"
      className={styles.list}
      id="file-mentions"
      role="listbox"
    >
      {line ? (
        <p className={styles.line} role="status">
          {line}
        </p>
      ) : null}
      {rows.map((entry, index) => {
        const name = entryName(entry)
        const folder = entryFolder(entry)
        return (
          <div
            aria-selected={index === 0}
            className={classes(styles.row, index === 0 && styles.highlighted)}
            key={entry.path}
            role="option"
          >
            <EntryIcon
              className={styles.icon}
              folder={entry.folder}
              name={name}
              size={14}
            />
            <span className={styles.name}>{name}</span>
            {folder ? <span className={styles.folder}>{folder}</span> : null}
          </div>
        )
      })}
    </div>
  )
}

/** The place of the list: just above the message box, over the chat. */
export function MentionAnchor(props: { children: ReactNode }) {
  return <div className={styles.anchor}>{props.children}</div>
}
