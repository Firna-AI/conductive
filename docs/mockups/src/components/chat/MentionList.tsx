import { useEffect, useRef, type ReactNode } from 'react'
import { classes } from '../common/classes'
import { EntryIcon } from '../files/fileIcons'
import styles from './FileMentionList.module.css'

/** A row of the list of `@`: the labels of one file or folder. */
export type MentionListRow = {
  /** The real path, which stays the key of the row. */
  key: string
  name: string
  /** The folder that holds the entry, with a final `/`, or '' at the root. */
  folder: string
  isFolder: boolean
}

/**
 * The list of `@` above the message box, as wide as the box (decision
 * 214): the icon, the name, and the folder of each row, as in Conductor.
 * `highlighted` marks the row that Enter or Tab picks. `line` takes the
 * place of the rows, such as while the tree loads. It takes no fixtures,
 * so the app draws its list with it. `onPick` and `onHighlight` come from
 * the app, and `rowId` gives each row the id that the field names as its
 * active row. The highlighted row scrolls into view as the arrows move it.
 */
export function MentionList(props: {
  id: string
  rows: readonly MentionListRow[]
  highlighted: number | null
  line: string | null
  rowId?: (index: number) => string
  onPick?: (index: number) => void
  onHighlight?: (index: number) => void
}) {
  const rowsByIndex = useRef(new Map<number, HTMLDivElement>())
  const { highlighted } = props
  useEffect(() => {
    if (highlighted === null) return
    rowsByIndex.current.get(highlighted)?.scrollIntoView?.({ block: 'nearest' })
  }, [highlighted])
  const keep = (index: number) => (row: HTMLDivElement | null) => {
    if (row) rowsByIndex.current.set(index, row)
    else rowsByIndex.current.delete(index)
  }
  return (
    <div
      aria-label="Files and folders"
      className={styles.list}
      id={props.id}
      role="listbox"
    >
      {props.line ? (
        <p className={styles.line} role="status">
          {props.line}
        </p>
      ) : null}
      {props.rows.map((row, index) => (
        <div
          aria-label={row.folder ? `${row.name}, ${row.folder}` : row.name}
          aria-selected={index === props.highlighted}
          className={classes(
            styles.row,
            index === props.highlighted && styles.highlighted,
          )}
          id={props.rowId?.(index)}
          key={row.key}
          onClick={() => props.onPick?.(index)}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => props.onHighlight?.(index)}
          ref={keep(index)}
          role="option"
        >
          <EntryIcon
            className={styles.icon}
            folder={row.isFolder}
            name={row.name}
            size={14}
          />
          <span className={styles.name}>{row.name}</span>
          {row.folder ? (
            <span className={styles.folder}>{row.folder}</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/**
 * The place of the list: just above the message box, over the chat. The
 * app gets the element through `onElement`, to draw its list there.
 */
export function MentionAnchor(props: {
  children: ReactNode
  onElement?: (element: HTMLDivElement | null) => void
}) {
  const { children, onElement } = props
  return (
    <div className={styles.anchor} ref={onElement}>
      {children}
    </div>
  )
}
