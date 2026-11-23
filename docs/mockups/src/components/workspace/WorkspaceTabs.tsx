import { createContext, Fragment, useContext } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { nameLabel } from '../../../../../src/shared/name-label'
import { closedSessions } from '../../fixtures/sessions'
import { paths } from '../../paths'
import { menu as menuPart } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { ScreenLink } from '../common/ScreenLink'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { defined } from '../../defined'
import { instanceKey } from '../../instanceKey'
import {
  dropPlace,
  tabItem,
} from '../../entries/components/workspace/TabItem.mockup'
import type { WorkspaceTab } from './TabItem'
import { tabMenuOf } from './TabMenu'
import tabScroll from '../../../../../src/ui/components/workspace/TabScroll.module.css'
import styles from '../../../../../src/ui/components/workspace/WorkspaceTabs.module.css'

/**
 * A tab in the middle of a drag: the key of the tab, and the place where it
 * lands, before the tab at `index`, or after the last tab.
 */
export type TabDrag = { tab: string; index: number }

/**
 * The sessions whose tabs the user closed, the last closed first: the mark
 * of the agent, the title, and the time. Each one reopens as a tab.
 */
export const historyEntries: readonly MenuEntryData[] = closedSessions.map(
  (session): MenuEntryData => ({
    kind: 'item',
    label: nameLabel(session.title),
    mark: { kind: 'agent', agent: session.agent },
    detail: session.closed,
    trailingIcon: 'rotate-ccw',
  }),
)

/**
 * The class of the clock when the screen draws the open session history
 * above the page, as the app opens it in the top layer of the browser. The
 * clock then draws no menu of its own, and the class names it as the anchor
 * where CSS places the menu, as `app/chat/menu-placement` shows.
 */
export const HistoryAnchor = createContext<string | undefined>(undefined)

/** The clock that opens the session history, with its menu when open. */
function HistoryButton(props: {
  open: boolean
  anchored: boolean
  entries: readonly MenuEntryData[]
}) {
  const anchor = useContext(HistoryAnchor)
  const hasHistory = props.entries.some((entry) => entry.kind === 'item')
  const button = (
    <iconButton.Component
      expanded={props.open}
      icon="history"
      label="Session history"
      menu
      moklyInstance="session-history"
    />
  )
  return (
    <span className={classes(styles.anchor, anchor)}>
      {hasHistory ? (
        props.open ? (
          button
        ) : (
          <ScreenLink asChild to={paths.sessionHistory}>
            {button}
          </ScreenLink>
        )
      ) : null}
      {props.open && props.anchored && anchor === undefined ? (
        <menuPart.Component
          entries={props.entries}
          label="Session history"
          moklyInstance="history-menu"
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
 * workspace, so a file or diff tab there opens a menu with only Copy path.
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
  historyEntries?: readonly MenuEntryData[]
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
}) {
  const { tabs, drag, menuTab } = props
  const readOnly = props.readOnly ?? false
  const phone = props.viewport === 'mobile'
  const full = props.full ?? false
  const from = tabs.findIndex((tab) => tab.key === drag?.tab)
  const dragged = tabs[from]
  const kept = props.renaming ?? tabs.find((tab) => tab.selected)?.key
  const endInView = full && kept !== undefined && tabs.at(-1)?.key === kept
  const menu = menuTab === undefined ? [] : tabMenuOf(tabs, menuTab, readOnly)
  const menuOpen = menu.length > 0
  // The lifted tab and a menu below a tab hang below the row.
  const overRow = dragged !== undefined || (menuOpen && !phone)
  const dropAt = (index: number) =>
    dragged && drag?.index === index ? (
      <dropPlace.Component
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
            <tabItem.Component
              moklyInstance={`tab-${instanceKey(tab.key)}`}
              placeholder={tab === dragged}
              renaming={tab.key === props.renaming}
              tab={tab}
              {...defined({
                menu:
                  menuOpen && tab.key === menuTab
                    ? { entries: menu, anchored: !phone }
                    : undefined,
              })}
            />
          </Fragment>
        ))}
        {dropAt(tabs.length)}
      </ul>
      {readOnly ? null : (
        <ScreenLink asChild to={paths.sessions}>
          <iconButton.Component
            icon="plus"
            label="New session"
            moklyInstance="new-session"
          />
        </ScreenLink>
      )}
      <HistoryButton
        anchored={!phone}
        entries={props.historyEntries ?? historyEntries}
        open={props.historyOpen ?? false}
      />
    </nav>
  )
}
