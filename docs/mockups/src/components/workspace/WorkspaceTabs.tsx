import { Fragment, type ReactElement } from 'react'
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
import { DropPlace, TabItem, type WorkspaceTab } from './TabItem'
import { tabMenuOf } from './TabMenu'
import tabScroll from './TabScroll.module.css'
import styles from './WorkspaceTabs.module.css'

/**
 * A tab in the middle of a drag: the key of the tab, and the place where it
 * lands, before the tab at `index`, or after the last tab.
 */
export type TabDrag = { tab: string; index: number }

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

/**
 * The screens of + and of the session history for a workspace whose
 * screens are not those of every workspace. A control without a screen
 * there stays static.
 */
export type SessionLinks = Readonly<{ newSession?: string; history?: string }>

/** A button that leads to `to`, or a static one when it has no screen. */
function Linked(props: { to?: string; children: ReactElement }) {
  if (props.to === undefined) return props.children
  return (
    <ScreenLink asChild to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/** The clock that opens the session history, with its menu when open. */
function HistoryButton(props: {
  open: boolean
  anchored: boolean
  entries: readonly MenuEntry[]
  to?: string
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
          <Linked to={props.to}>{button}</Linked>
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
 * `renaming` draws the rename field in a tab, after Rename session in its
 * menu. `full` draws a row whose tabs do not fit, scrolled to the tab that
 * it keeps in view: the tab with the rename field, or else the shown tab.
 * `historyOpen` draws the history open, beside the clock or, on a phone, as
 * a sheet that the screen draws. On a phone the current tab shrinks too, so
 * that every tab keeps some of its title.
 */
export function WorkspaceTabs(props: {
  tabs: readonly WorkspaceTab[]
  viewport: Viewport
  historyEntries?: readonly MenuEntry[]
  historyOpen?: boolean
  /** An archived workspace: no new session. */
  readOnly?: boolean
  drag?: TabDrag
  menuTab?: string
  renaming?: string
  full?: boolean
  /** The screens of + and of the history, for the workspace of the row. */
  links?: SessionLinks
}) {
  const { tabs, drag, menuTab, links } = props
  const readOnly = props.readOnly ?? false
  const phone = props.viewport === 'mobile'
  const full = props.full ?? false
  const from = tabs.findIndex((tab) => tab.key === drag?.tab)
  const dragged = tabs[from]
  const kept = props.renaming ?? tabs.find((tab) => tab.selected)?.key
  const endInView = full && kept !== undefined && tabs.at(-1)?.key === kept
  // The lifted tab and a menu below a tab hang below the row.
  const overRow = dragged !== undefined || (menuTab !== undefined && !phone)
  const dropAt = (index: number) =>
    dragged && drag?.index === index ? (
      <DropPlace
        count={tabs.length}
        place={placeAfterDrop(from, index)}
        tab={dragged}
      />
    ) : null
  return (
    <nav
      aria-label="Sessions and files"
      className={classes(styles.bar, phone && styles.phone)}
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
            {dropAt(index)}
            <TabItem
              menu={
                tab.key === menuTab
                  ? { entries: tabMenuOf(tabs, tab.key), anchored: !phone }
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
        <Linked to={links ? links.newSession : paths.sessions}>
          <IconButton icon={Plus} label="New session" />
        </Linked>
      )}
      <HistoryButton
        anchored={!phone}
        entries={props.historyEntries ?? historyEntries}
        open={props.historyOpen ?? false}
        to={links ? links.history : paths.sessionHistory}
      />
    </nav>
  )
}
