import { MessageSquare, Pencil, X } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { IconButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { RenameField } from './RenameField'
import type { SessionTab, TabCloseProps, TabItemProps } from './tab-row'

/**
 * The tab of a session: a button that shows the session, and Close. The
 * shown session tab can be renamed, and its rename field takes the place of
 * the button. `item` and `close` are the props that the row gives the list
 * item and the wrapper of Close.
 */
export function SessionTabItem(props: {
  tab: SessionTab
  readOnly: boolean
  renaming: boolean
  item: TabItemProps
  close: TabCloseProps
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onStartRename: (id: string) => void
  onRename: (id: string, title: string) => void
  onCancelRename: () => void
}) {
  const { tab, item } = props
  if (props.renaming) {
    return (
      <li {...item} className={classes(styles.tab, styles.selected)}>
        <RenameField
          onCancel={props.onCancelRename}
          onSave={(title) => props.onRename(tab.id, title)}
          title={tab.title}
        />
      </li>
    )
  }
  return (
    <li
      {...item}
      className={classes(
        styles.tab,
        tab.selected && styles.selected,
        item.className,
      )}
    >
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
      <span {...props.close} className={styles.close}>
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
 * The copy of a session tab that a drag lifts above the page: its icon and
 * its whole title, with no control.
 */
export function LiftedSessionTab(props: { title: string }) {
  return (
    <div className={classes(styles.tab, styles.lifted)}>
      <span className={styles.link}>
        <MessageSquare aria-hidden className={styles.icon} size={13} />
        <span className={styles.title}>{props.title}</span>
      </span>
    </div>
  )
}
