import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { KeyChips } from '../../../docs/mockups/src/components/common/KeyChips'
import styles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import { activityPresentation } from '../../../docs/mockups/src/components/workspaces/status'
import { StatusGlyph } from '../../../docs/mockups/src/components/workspaces/StatusGlyph'
import type { PaletteResults } from '../../app/palette/palette-results'
import type { PaletteRow } from '../../app/palette/palette-rows'
import type { PaletteRead } from '../../app/palette/palette-source'
import { formatAgo } from '../../app/time'
import { useShortcutHint, type ShortcutHint } from '../shortcuts/shortcut-hints'
import ui from '../ui/ui.module.css'
import local from './palette.module.css'
import { PaletteEmpty } from './PaletteEmpty'
import { PaletteStatusPart } from './PaletteStatus'
import { RowLead } from './RowLead'
import { nameLabel } from '../../shared/name-label'

/** A press in the list keeps the focus in the search field. */
function keepFieldFocus(event: MouseEvent) {
  event.preventDefault()
}

/** A click with a modifier key, which opens a link as the browser does. */
function opensElsewhere(event: MouseEvent): boolean {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

/**
 * What a row shows. A workspace shows its state mark, the label of its
 * number while the query matches that label, its name, its repository, and
 * the age of its latest activity. A command row ends with the key of its
 * command, as `useShortcutHint` gives it. The option names that key to a
 * screen reader, so the chips are hidden from it.
 */
function RowContent(props: {
  row: PaletteRow
  now: number
  hint: ShortcutHint | undefined
}) {
  const { row, hint } = props
  if (row.kind === 'command') {
    return (
      <>
        <span className={styles.lead}>
          <RowLead lead={row.lead} />
        </span>
        <span className={styles.label}>{row.label}</span>
        {row.detail ? (
          <span className={styles.detail}>{row.detail}</span>
        ) : null}
        {hint ? (
          <span aria-hidden className={styles.keys}>
            <KeyChips shortcut={hint.text} />
          </span>
        ) : null}
      </>
    )
  }
  const { workspace } = row
  return (
    <>
      <span className={styles.lead}>
        <StatusGlyph status={workspace.state} />
      </span>
      {row.numberLabel ? (
        <span className={styles.number}>{row.numberLabel}</span>
      ) : null}
      <span className={styles.label}>{nameLabel(workspace.name)}</span>
      <span className={styles.repository}>{row.repository}</span>
      <span className={styles.end}>
        {formatAgo(props.now, workspace.updatedAt)}
      </span>
      <span className={ui.hidden}>
        , {activityPresentation[workspace.state].label}
      </span>
    </>
  )
}

/**
 * One option of the list. A row that opens a page is a link, so a click
 * with a modifier key opens the page as the browser does. A plain click
 * runs the row.
 */
function Row(props: {
  row: PaletteRow
  id: string
  highlighted: boolean
  now: number
  onRun: (row: PaletteRow) => void
}) {
  const { row, highlighted } = props
  const hint = useShortcutHint(row.kind === 'command' ? row.command : undefined)
  const option = useRef<HTMLElement | null>(null)
  const setOption = useCallback((element: HTMLElement | null) => {
    option.current = element
  }, [])
  useEffect(() => {
    if (highlighted) option.current?.scrollIntoView?.({ block: 'nearest' })
  }, [highlighted])
  const emphasis =
    row.kind === 'workspace'
      ? styles[activityPresentation[row.workspace.state].emphasis]
      : undefined
  const className = classes(
    styles.row,
    emphasis,
    highlighted && styles.highlighted,
  )
  const onClick = (event: MouseEvent) => {
    if (row.href !== undefined && opensElsewhere(event)) return
    event.preventDefault()
    props.onRun(row)
  }
  const content = <RowContent hint={hint} now={props.now} row={row} />
  if (row.href !== undefined) {
    return (
      <a
        aria-keyshortcuts={hint?.aria}
        aria-selected={highlighted}
        className={className}
        href={row.href}
        id={props.id}
        onClick={onClick}
        ref={setOption}
        role="option"
        tabIndex={-1}
      >
        {content}
      </a>
    )
  }
  return (
    <div
      aria-keyshortcuts={hint?.aria}
      aria-selected={highlighted}
      className={classes(className, local.choice)}
      id={props.id}
      onClick={onClick}
      ref={setOption}
      role="option"
    >
      {content}
    </div>
  )
}

/**
 * The results: the status part of data that did not load, then the groups
 * as the listbox of the search field. The highlighted option is the one
 * that Enter runs. Both scroll under the search field and the tabs.
 */
export function PaletteList(props: {
  results: PaletteResults
  listboxId: string
  optionId: (index: number) => string
  active: number
  now: number
  onRun: (row: PaletteRow) => void
  retry: (reads: readonly PaletteRead[]) => Promise<void>
}) {
  const { groups, empty, status } = props.results
  if (empty) return <PaletteEmpty empty={empty} />
  const starts = groups.map((_, at) =>
    groups.slice(0, at).reduce((sum, group) => sum + group.rows.length, 0),
  )
  const labelId = (at: number) => `${props.listboxId}-group-${at}`
  const body: ReactNode = groups.map((group, at) => (
    <div
      aria-labelledby={labelId(at)}
      className={styles.group}
      key={`${at}-${group.label}`}
      role="group"
    >
      <div className={styles.groupLabel} id={labelId(at)} role="presentation">
        {group.label}
      </div>
      <div className={styles.rows} role="presentation">
        {group.rows.map((row, index) => (
          <Row
            highlighted={starts[at] + index === props.active}
            id={props.optionId(starts[at] + index)}
            key={row.key}
            now={props.now}
            onRun={props.onRun}
            row={row}
          />
        ))}
      </div>
    </div>
  ))
  return (
    <div className={styles.results}>
      {status ? (
        <PaletteStatusPart retry={props.retry} status={status} />
      ) : null}
      {groups.length > 0 ? (
        <div
          aria-label="Results"
          id={props.listboxId}
          onMouseDown={keepFieldFocus}
          role="listbox"
        >
          {body}
        </div>
      ) : null}
    </div>
  )
}
