import { Fragment } from 'react'
import type { Viewport } from '@mokly/mokly'
import { History, Plus, RotateCcw } from 'lucide-react'
import { nameLabel } from '../../../../../src/shared/name-label'
import { closedSessions } from '../../fixtures/sessions'
import { paths } from '../../paths'
import { AgentMark } from '../chat/AgentMark'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { moveStatus, type TabMove } from './paneCopy'
import { DropPlace, TabItem, type WorkspaceTab } from './TabItem'
import { tabMenuOf } from './TabMenu'
import tabScroll from './TabScroll.module.css'
import styles from './WorkspaceTabs.module.css'

/**
 * A tab in the middle of a drag. `tab` is the key of the dragged tab, which
 * stays at its place in its own row as a faint copy. `index` is where it
 * lands in this row: before the tab at `index`, or after the last tab. A
 * drag that lands elsewhere, such as on the content of a pane, draws no
 * line in this row. `from` is the dragged tab when it comes from the other
 * pane of a split, and `move` names the pane that the drop moves it to.
 */
export type TabDrag = {
  tab: string
  index?: number
  from?: WorkspaceTab
  move?: TabMove
}

/**
 * The sessions whose tabs the user closed, the last closed first: the mark
 * of the agent, the title, and the time. Each one reopens as a tab.
 */
export const historyEntries: readonly MenuEntry[] = closedSessions.map(
  (session): MenuEntry => ({
    kind: 'item',
    label: nameLabel(session.title),
    mark: <AgentMark agent={session.agent} />,
    detail: session.closed,
    trailingIcon: RotateCcw,
  }),
)

/** The clock that opens the session history, with its menu when open. */
function HistoryButton(props: {
  open: boolean
  anchored: boolean
  entries: readonly MenuEntry[]
}) {
  const hasHistory = props.entries.some((entry) => entry.kind === 'item')
  const button = (
    <IconButton
      expanded={props.open}
      icon={History}
      label="Session history"
      menu
    />
  )
  return (
    <span className={styles.anchor}>
      {hasHistory ? (
        props.open ? (
          button
        ) : (
          <ScreenLink asChild to={paths.sessionHistory}>
            {button}
          </ScreenLink>
        )
      ) : null}
      {props.open && props.anchored ? (
        <Menu
          entries={props.entries}
          label="Session history"
          placement="below-end"
          wide
        />
      ) : null}
    </span>
  )
}

/** The place of a dragged tab after its drop, counted from 1. */
function placeAfterDrop(from: number, index: number): number {
  return index > from ? index : index + 1
}

/**
 * The tabs of the centre column: the agent sessions and the open files and
 * diffs in the order that the user gave them, + for a new session on the
 * same branch and cloud computer, and the clock of the session history.
 * Every tab closes, and a right click opens its menu, the one way to rename
 * a session. `drag` draws a tab in the middle of a drag, and `menuTab` the
 * menu of a tab, below it or, on a phone, as a sheet that the screen draws.
 * In a read-only workspace the menu leaves out each item that changes the
 * workspace, so a file or diff tab there opens no menu.
 * `renaming` draws the rename field in a tab, after Rename session in its
 * menu. `full` draws a row whose tabs do not fit, scrolled to the tab that
 * it keeps in view: the tab with the rename field, or else the shown tab.
 * `historyOpen` draws the history open, beside the clock or, on a phone, as
 * a sheet that the screen draws. On a phone the current tab shrinks too, so
 * that every tab keeps some of its title.
 *
 * A split centre column gives each pane its own row (split panes decision
 * 1 C). `focused` marks the row of the focused pane, and only the right row
 * keeps the clock. `border` parts the tabs of the two panes in the one row
 * of a phone or of a narrow column.
 */
export function WorkspaceTabs(props: {
  tabs: readonly WorkspaceTab[]
  viewport: Viewport
  historyEntries?: readonly MenuEntry[]
  historyOpen?: boolean
  /**
   * A read-only workspace, such as an archived one: no new session, and a
   * tab menu with only the items that change nothing.
   */
  readOnly?: boolean
  drag?: TabDrag
  menuTab?: string
  renaming?: string
  full?: boolean
  /**
   * The row of the focused pane of a split, whose shown tab takes the mark
   * of the focus, or of the other pane. One pane draws no mark.
   */
  focused?: boolean
  /** The row ends with the clock of the session history, as it starts. */
  history?: boolean
  /** The name of the row for a screen reader, which names its pane. */
  label?: string
  /**
   * The index of the first tab of the right pane, in the one row that holds
   * the tabs of both panes. A quiet border stands between the two parts.
   */
  border?: number
}) {
  const { tabs, drag, menuTab, border } = props
  const readOnly = props.readOnly ?? false
  const phone = props.viewport === 'mobile'
  const full = props.full ?? false
  const from = tabs.findIndex((tab) => tab.key === drag?.tab)
  const dragged = from < 0 ? drag?.from : tabs[from]
  const kept = props.renaming ?? tabs.find((tab) => tab.selected)?.key
  const endInView = full && kept !== undefined && tabs.at(-1)?.key === kept
  const menu = menuTab === undefined ? [] : tabMenuOf(tabs, menuTab, readOnly)
  const menuOpen = menu.length > 0
  // The lifted tab and a menu below a tab hang below the row.
  const lifted = dragged !== undefined && drag?.index !== undefined
  const overRow = lifted || (menuOpen && !phone)
  const dropAt = (index: number) => {
    if (!dragged || drag?.index !== index) return null
    // A tab from the other pane adds one tab to this row.
    const move: TabMove = drag.move ?? {
      kind: 'place',
      place: from < 0 ? index + 1 : placeAfterDrop(from, index),
      count: from < 0 ? tabs.length + 1 : tabs.length,
    }
    return <DropPlace status={moveStatus(dragged.title, move)} tab={dragged} />
  }
  // A line at the border ends the left part when the tab moves to the left
  // pane, and else starts the right part.
  const toLeft = drag?.move?.kind === 'pane' && drag.move.pane === 'left'
  const before = (index: number) => {
    if (index !== border || index === 0) return dropAt(index)
    const mark = <li aria-hidden className={styles.paneBorder} />
    return toLeft ? (
      <>
        {dropAt(index)}
        {mark}
      </>
    ) : (
      <>
        {mark}
        {dropAt(index)}
      </>
    )
  }
  return (
    <nav
      aria-label={props.label ?? 'Sessions and files'}
      className={classes(
        styles.bar,
        phone && styles.phone,
        props.focused === true && styles.focused,
        props.focused === false && styles.unfocused,
      )}
    >
      <ul
        className={classes(
          styles.tabs,
          tabScroll.scroll,
          endInView && tabScroll.scrolledToEnd,
          full && (endInView ? tabScroll.fadeStart : tabScroll.fadeEnd),
          overRow && !full && tabScroll.clipSides,
        )}
      >
        {tabs.map((tab, index) => (
          <Fragment key={tab.key}>
            {before(index)}
            <TabItem
              menu={
                menuOpen && tab.key === menuTab
                  ? { entries: menu, anchored: !phone }
                  : undefined
              }
              placeholder={tab === dragged}
              renaming={tab.key === props.renaming}
              tab={tab}
            />
          </Fragment>
        ))}
        {dropAt(tabs.length)}
      </ul>
      {readOnly ? null : (
        <ScreenLink asChild to={paths.sessions}>
          <IconButton icon={Plus} label="New session" />
        </ScreenLink>
      )}
      {props.history === false ? null : (
        <HistoryButton
          anchored={!phone}
          entries={props.historyEntries ?? historyEntries}
          open={props.historyOpen ?? false}
        />
      )}
    </nav>
  )
}
