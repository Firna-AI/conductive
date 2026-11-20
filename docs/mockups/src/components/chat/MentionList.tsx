import { useEffect, useRef, type ReactNode } from 'react'
import { classes } from '../common/classes'
import styles from './FileMentionList.module.css'

/**
 * A row of the list of `@`: the labels of one file or folder. The list of
 * `/` gives each skill a row too, with its description and no folder.
 */
export type MentionListRow = {
  /** The real path, or the name of a skill, which stays the key of the row. */
  key: string
  name: string
  /** The folder that holds the entry, with a final `/`, or '' at the root. */
  folder: string
  /** The muted line after the name, such as the description of a skill. */
  description?: string
  /** The icon, as All files draws it. The caller gives it. */
  icon: ReactNode
}

/** The spoken name of a row: the name, then its folder or its description. */
function rowLabel(row: MentionListRow): string {
  const detail = row.folder || row.description
  return detail ? `${row.name}, ${detail}` : row.name
}

/**
 * The list of `@` above the message box, as wide as the box: the icon,
 * the name, and the folder of each row, as in Conductor. The list of `/`
 * shows the name and the description of each skill in the same way, and
 * `label` names its listbox.
 * `highlighted` marks the row that Enter or Tab picks. `line` takes the
 * place of the rows, such as while the tree loads. It takes no fixtures,
 * so the app draws its list with it. `onPick` and `onHighlight` come from
 * the app, and `rowId` gives each row the id that the field names as its
 * active row. The highlighted row scrolls into view as the arrows move it.
 * The box holds the line or the listbox of the rows, so the listbox owns
 * only its options. Give each query its own list, through a key, so a new
 * query starts at the top with its first row in view.
 */
export function MentionList(props: {
  id: string
  /** The name of the listbox. Without it, the list holds files and folders. */
  label?: string
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
    <div className={styles.list} id={props.id}>
      {props.line ? (
        <p className={styles.line} role="status">
          {props.line}
        </p>
      ) : null}
      {props.rows.length > 0 ? (
        <div
          aria-label={props.label ?? 'Files and folders'}
          className={styles.rows}
          role="listbox"
        >
          {props.rows.map((row, index) => (
            <div
              aria-label={rowLabel(row)}
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
              <span className={styles.icon}>{row.icon}</span>
              <span className={styles.name}>{row.name}</span>
              {row.folder ? (
                <span className={styles.folder}>{row.folder}</span>
              ) : null}
              {row.description ? (
                <span className={styles.description}>{row.description}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
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
