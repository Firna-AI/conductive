import { useCallback, useRef, type ReactNode } from 'react'
import { History, MessageSquare, Pencil, Plus, X } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { IconButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { useDismiss } from '../ui/dismiss'
import { Menu, type MenuEntry } from '../ui/Menu'
import { RenameField } from './RenameField'

export interface SessionTab {
  id: string
  title: string
  selected: boolean
}

function Tab(props: {
  tab: SessionTab
  readOnly: boolean
  renaming: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onStartRename: (id: string) => void
  onRename: (id: string, title: string) => void
  onCancelRename: () => void
}) {
  const { tab } = props
  if (props.renaming) {
    return (
      <li className={classes(styles.tab, styles.selected)}>
        <RenameField
          onCancel={props.onCancelRename}
          onSave={(title) => props.onRename(tab.id, title)}
          title={tab.title}
        />
      </li>
    )
  }
  return (
    <li className={classes(styles.tab, tab.selected && styles.selected)}>
      <button
        aria-current={tab.selected ? 'page' : undefined}
        className={classes(controls.bare, styles.link)}
        onClick={() => props.onSelect(tab.id)}
        type="button"
      >
        <MessageSquare aria-hidden className={styles.icon} size={13} />
        <span className={styles.title}>{tab.title}</span>
      </button>
      {tab.selected && !props.readOnly ? (
        <IconButton
          icon={Pencil}
          label={`Rename ${tab.title}`}
          onPress={() => props.onStartRename(tab.id)}
          quiet
        />
      ) : null}
      <span className={styles.close}>
        <IconButton
          icon={X}
          label={`Close ${tab.title}`}
          onPress={() => props.onClose(tab.id)}
          quiet
        />
      </span>
    </li>
  )
}

/**
 * The tabs of the sessions, then other tabs that the app adds, such as open
 * files, + for a new session on the same branch and cloud computer, and the
 * clock of the session history. Every tab closes, and the current session
 * can be renamed. On desktop the history opens beside the clock; a phone
 * shows it as a sheet that the chat draws.
 */
export function SessionTabs(props: {
  tabs: readonly SessionTab[]
  mobile: boolean
  /** A read-only chat: no new session and no rename. */
  readOnly: boolean
  renaming: string | null
  historyOpen: boolean
  historyEntries: readonly MenuEntry[]
  extraTabs?: ReactNode
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onStartRename: (id: string) => void
  onRename: (id: string, title: string) => void
  onCancelRename: () => void
  onNew: () => void
  onShowHistory: (open: boolean) => void
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const { onShowHistory } = props
  const closeHistory = useCallback(() => onShowHistory(false), [onShowHistory])
  const menuOpen = props.historyOpen && !props.mobile
  useDismiss(anchor, menuOpen, closeHistory)
  return (
    <nav
      aria-label="Sessions and files"
      className={classes(styles.bar, props.mobile && styles.phone)}
    >
      <ul className={styles.tabs}>
        {props.tabs.map((tab) => (
          <Tab
            key={tab.id}
            onCancelRename={props.onCancelRename}
            onClose={props.onClose}
            onRename={props.onRename}
            onSelect={props.onSelect}
            onStartRename={props.onStartRename}
            readOnly={props.readOnly}
            renaming={props.renaming === tab.id}
            tab={tab}
          />
        ))}
        {props.extraTabs}
      </ul>
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
    </nav>
  )
}
