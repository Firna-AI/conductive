import type { TranscriptDetail } from '../../shared/generated/TranscriptDetail'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { History, Plus } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import tabScroll from '../../../docs/mockups/src/components/workspace/TabScroll.module.css'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { ownPress } from '../../app/pointer-drag'
import { useSidewaysWheel } from '../../app/sideways-wheel'

import type { WorkspaceTab } from '../../shared/workspace-view'
import type { TabTarget } from '../state/tab-order'
import { IconButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { useDismiss } from '../ui/dismiss'
import { Menu, type MenuEntry } from '../ui/Menu'
import { useEdgeScroll, useRowScroll } from './row-scroll'
import { SessionTabItem } from './SessionTab'
import { DropLine, LiftedTab } from './TabDragParts'
import { closeTabsRight } from './close-right'
import { keepsPaneFocus } from './pane-focus'
import { TabMenu } from './TabMenu'
import { TabNodes } from './tab-nodes'
import { rowKey, type RowTab } from './tab-row'
import { useTabDrag } from './useTabDrag'
import { useTabMenu } from './useTabMenu'
import { useTabMoves } from './useTabMoves'

/** The tab that the row keeps in view: the one that renames, else the shown one. */
function keptTab(tabs: readonly RowTab[], renaming: string | null) {
  const tab = tabs.find((item) =>
    renaming === null
      ? item.selected
      : item.kind === 'session' && item.id === renaming,
  )
  return tab ? rowKey(tab) : null
}

/** The index of the first tab of the right pane in a row with both, if any. */
function borderOf(tabs: readonly RowTab[]): number | null {
  const at = tabs.findIndex((tab) => tab.pane !== tabs[0]?.pane)
  return at > 0 ? at : null
}

/** The props of the tab row, as `SessionTabs` says. */
export interface SessionTabsProps {
  tabs: readonly RowTab[]
  mobile: boolean
  /** The name of the row for a screen reader. By default, one row's name. */
  label?: string
  /**
   * The mark of the focus of a split: the row of the focused pane, or of
   * the other pane. One pane draws no mark.
   */
  focus?: 'focused' | 'unfocused'
  /** The row ends with the clock of the session history. By default it does. */
  history?: boolean
  /**
   * A read-only chat: no new session and no move, and the tab menu holds
   * only the items that change nothing, such as the copies.
   */
  readOnly: boolean
  renaming: string | null
  historyOpen: boolean
  historyEntries: readonly MenuEntry[]
  onSelect: (id: string) => void
  /** Closes session tabs, with one question for the running sessions. */
  onClose: (...ids: string[]) => void
  /** Closes file and diff tabs of the host, for Close tabs to the right. */
  onCloseTabs: (tabs: readonly WorkspaceTab[]) => void
  onStartRename: (id: string) => void
  onRename: (id: string, title: string) => void
  onCancelRename: () => void
  /** Copies the transcript of a session, during the press of its item. */
  onCopy: (id: string, detail: TranscriptDetail) => void
  /** Copies the link of a session. Without it, the menu has no Copy link. */
  onCopyLink?: (id: string) => void
  /** Moves a tab to a place in the row of a pane, as `TabTarget` says. */
  onMove: (tab: WorkspaceTab, target: TabTarget) => void
  onNew: () => void
  onShowHistory: (open: boolean) => void
}

/**
 * The tab row: the session tabs and the tabs that the host names and draws,
 * such as open files, in the order of the saved view, then +
 * for a new session on the same branch and cloud computer, and the clock of
 * the session history. Every tab closes. A tab moves by drag and drop, or
 * by a long press on a phone, as `useTabDrag` says, and its tab menu renames
 * a session, copies its link or its transcript, keeps the temporary tab,
 * moves a tab one place, and closes the tabs to its right in its pane, as
 * `useTabMenu` says. A row whose tabs do not fit scrolls sideways, as
 * `useRowScroll` says. On desktop the history and the tab menu open beside
 * their trigger; a phone shows them as sheets. The one row of a phone with
 * two panes holds the tabs of the left pane, a short neutral line, then the
 * tabs of the right pane. The clock of the history leaves the focused pane
 * as it is, because a session that it reopens goes to the focused pane.
 */
export function SessionTabs(props: SessionTabsProps) {
  const { tabs, renaming, onShowHistory } = props
  const [nodes] = useState(() => new TabNodes())
  const row = useRef<HTMLUListElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const closeHistory = useCallback(() => onShowHistory(false), [onShowHistory])
  const history = props.history ?? true
  const hasHistory = props.historyEntries.some((entry) => entry.kind === 'item')
  const historyMenu = history && props.historyOpen && !props.mobile
  useDismiss(anchor, historyMenu, closeHistory)
  const enabled = !props.readOnly
  const border = borderOf(tabs)
  const moves = useTabMoves({ tabs, nodes, onMove: props.onMove })
  const menu = useTabMenu({
    tabs,
    readOnly: props.readOnly,
    renaming,
    onRename: props.onStartRename,
    onStep: moves.step,
    onCloseRight: (tab) =>
      closeTabsRight(
        tabs.filter((item) => item.pane === tab.pane),
        tab,
        props,
      ),
    onKeep: moves.keep,
    onCopy: props.onCopy,
    onCopyLink: props.onCopyLink,
  })
  const drag = useTabDrag({
    tabs,
    nodes,
    enabled,
    renaming,
    onMove: moves.drop,
    onHold: menu.open,
  })
  const dragging = drag.lifted !== null
  const { forget } = moves
  useEffect(() => {
    if (dragging) forget()
  }, [dragging, forget])
  const fades = useRowScroll({
    row,
    nodes,
    keys: tabs.map(rowKey),
    kept: keptTab(tabs, renaming),
    moved: moves.moved,
  })
  useEdgeScroll(row, drag.lifted)
  useSidewaysWheel(row)
  const parts = (tab: RowTab, index: number) => {
    const key = rowKey(tab)
    return {
      item: menu.item(tab, index, drag.item(tab, index)),
      link: { ref: nodes.linkRef(key) },
      close: ownPress,
    }
  }
  const focused = props.focus !== 'unfocused'
  return (
    <nav
      aria-label={props.label ?? 'Sessions and files'}
      className={classes(
        styles.bar,
        props.mobile && styles.phone,
        props.focus === 'focused' && styles.focused,
        props.focus === 'unfocused' && styles.unfocused,
      )}
    >
      <ul
        className={classes(
          styles.tabs,
          tabScroll.scroll,
          fades.start && tabScroll.fadeStart,
          fades.end && tabScroll.fadeEnd,
        )}
        ref={row}
      >
        {tabs.map((tab, index) => (
          <Fragment key={rowKey(tab)}>
            {index === border ? (
              <li aria-hidden className={styles.paneBorder} />
            ) : null}
            {drag.lineBefore === rowKey(tab) ? <DropLine /> : null}
            {tab.kind === 'session' ? (
              <SessionTabItem
                {...parts(tab, index)}
                onCancelRename={props.onCancelRename}
                onClose={props.onClose}
                onRename={props.onRename}
                onSelect={props.onSelect}
                renaming={renaming === tab.id}
                tab={tab}
              />
            ) : (
              tab.draw({
                kind: 'row',
                ...parts(tab, index),
                selected: tab.selected,
                focused,
              })
            )}
          </Fragment>
        ))}
        {drag.lineAtEnd ? <DropLine /> : null}
      </ul>
      <span className={controls.hidden} role="status">
        {drag.status || moves.status}
      </span>
      {props.readOnly ? null : (
        <IconButton
          icon={Plus}
          label="New session"
          onPress={props.onNew}
          shortcut="new-session"
        />
      )}
      {history ? (
        <span className={styles.anchor} ref={anchor} {...keepsPaneFocus}>
          {hasHistory ? (
            <IconButton
              expanded={props.historyOpen}
              icon={History}
              label="Session history"
              menu
              onPress={() => onShowHistory(!props.historyOpen)}
              shortcut="session-history"
            />
          ) : null}
          {historyMenu ? (
            <Menu
              entries={props.historyEntries}
              label="Session history"
              onClose={closeHistory}
              placement="below-end"
              wide
            />
          ) : null}
        </span>
      ) : null}
      {menu.menu ? (
        <TabMenu menu={menu.menu} mobile={props.mobile} onClose={menu.close} />
      ) : null}
      {drag.lifted ? (
        <LiftedTab
          mobile={props.mobile}
          tab={drag.lifted.tab}
          top={drag.lifted.top}
          x={drag.lifted.x}
        />
      ) : null}
    </nav>
  )
}
