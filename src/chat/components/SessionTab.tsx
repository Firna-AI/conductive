import { MessageSquare, X } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { IconButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { RenameField } from './RenameField'
import type {
  SessionTab,
  TabCloseProps,
  TabItemProps,
  TabLinkProps,
} from './tab-row'

/**
 * The tab of a session: a button that shows the session, and Close. Its
 * rename field takes the place of both while the user renames the session
 * from the tab menu. The field marks the tab, so the tab keeps a fill only
 * when it is the shown tab. `item`, `link`, and `close` are the props that
 * the row gives the list item, the button, and the wrapper of Close.
 */
export function SessionTabItem(props: {
  tab: SessionTab
  renaming: boolean
  item: TabItemProps
  link: TabLinkProps
  close: TabCloseProps
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRename: (id: string, title: string) => void
  onCancelRename: () => void
}) {
  const { tab, item, link, close } = props
  if (props.renaming) {
    return (
      <li
        {...item}
        className={classes(
          styles.tab,
          tab.selected && styles.selected,
          styles.renaming,
        )}
      >
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
        {...link}
        aria-current={tab.selected ? 'page' : undefined}
        className={classes(controls.bare, styles.link)}
        onClick={() => props.onSelect(tab.id)}
        type="button"
      >
        <MessageSquare aria-hidden className={styles.icon} size={13} />
        <span className={styles.title}>{tab.title}</span>
      </button>
      <span {...close} className={styles.close}>
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
