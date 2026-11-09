import { Fragment, useCallback, useRef } from 'react'
import { History, Plus } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { ownPress } from '../../app/pointer-drag'
import type { WorkspaceTab } from '../../shared/workspace-view'
import type { TabPlace } from '../state/tab-order'
import { IconButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { useDismiss } from '../ui/dismiss'
import { Menu, type MenuEntry } from '../ui/Menu'
import { SessionTabItem } from './SessionTab'
import { DropLine, LiftedTab } from './TabDragParts'
import { rowKey, type RenderTab, type RowTab } from './tab-row'
import { useTabDrag } from './useTabDrag'

/**
 * The tab row: the session tabs and the tabs that the host draws with
 * `renderTab`, such as open files, in the order of the saved view, then +
 * for a new session on the same branch and cloud computer, and the clock of
 * the session history. Every tab closes, and the current session can be
 * renamed. A tab moves by drag and drop, or by a long press on a phone, as
 * `useTabDrag` says. On desktop the history opens beside the clock; a phone
 * shows it as a sheet that the chat draws.
 */
export function SessionTabs(props: {
  tabs: readonly RowTab[]
  mobile: boolean
  /** A read-only chat: no new session, no rename, and no move. */
  readOnly: boolean
  renaming: string | null
  historyOpen: boolean
  historyEntries: readonly MenuEntry[]
  renderTab?: RenderTab
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onStartRename: (id: string) => void
  onRename: (id: string, title: string) => void
  onCancelRename: () => void
  onMove: (tab: WorkspaceTab, place: TabPlace) => void
  onNew: () => void
  onShowHistory: (open: boolean) => void
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const { onShowHistory } = props
  const closeHistory = useCallback(() => onShowHistory(false), [onShowHistory])
  const menuOpen = props.historyOpen && !props.mobile
  useDismiss(anchor, menuOpen, closeHistory)
  const drag = useTabDrag({
    tabs: props.tabs,
    enabled: !props.readOnly,
    renaming: props.renaming,
    onMove: props.onMove,
  })
  return (
    <nav
      aria-label="Sessions and files"
      className={classes(styles.bar, props.mobile && styles.phone)}
    >
      <ul className={styles.tabs}>
        {props.tabs.map((tab, index) => (
          <Fragment key={rowKey(tab)}>
            {drag.lineBefore === rowKey(tab) ? <DropLine /> : null}
            {tab.kind === 'session' ? (
              <SessionTabItem
                close={ownPress}
                item={drag.item(tab, index)}
                onCancelRename={props.onCancelRename}
                onClose={props.onClose}
                onRename={props.onRename}
                onSelect={props.onSelect}
                onStartRename={props.onStartRename}
                readOnly={props.readOnly}
                renaming={props.renaming === tab.id}
                tab={tab}
              />
            ) : (
              props.renderTab?.(tab.tab, {
                kind: 'row',
                item: drag.item(tab, index),
                close: ownPress,
              })
            )}
          </Fragment>
        ))}
        {drag.lineAtEnd ? <DropLine /> : null}
      </ul>
      <span className={controls.hidden} role="status">
        {drag.status}
      </span>
      {props.readOnly ? null : (
        <IconButton icon={Plus} label="New session" onPress={props.onNew} />
      )}
      <span className={styles.anchor} ref={anchor}>
        <IconButton
          expanded={props.historyOpen}
          icon={History}
          label="Session history"
          menu
          onPress={() => onShowHistory(!props.historyOpen)}
        />
        {menuOpen ? (
          <Menu
            entries={props.historyEntries}
            label="Session history"
            onClose={closeHistory}
            placement="below-end"
            wide
          />
        ) : null}
      </span>
      {drag.lifted ? (
        <LiftedTab
          mobile={props.mobile}
          renderTab={props.renderTab}
          tab={drag.lifted.tab}
          top={drag.lifted.top}
          x={drag.lifted.x}
        />
      ) : null}
    </nav>
  )
}
