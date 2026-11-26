import { X } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/workspace/WorkspaceTabs.module.css'
import { SessionTabIcon } from '../../ui/components/workspace/SessionTabIcon'
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
 * The icon and the title of a session tab, in the row and on the lifted copy
 * of a drag. The icon shows the needs-input mark while the session holds an
 * open request, else the spinner while its turn runs, else the chat icon.
 * The mark comes first, so a screen reader hears "Needs input" before the
 * title.
 */
function TabFace(props: { tab: SessionTab }) {
  const { tab } = props
  return (
    <>
      <SessionTabIcon needsInput={tab.needsInput} running={tab.running} />
      <span className={styles.title}>{tab.title}</span>
    </>
  )
}

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
          title={tab.name}
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
        <TabFace tab={tab} />
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
 * The copy of a session tab that a drag lifts above the page: the icon of
 * the tab, also the needs-input mark, and its whole title, with no control.
 */
export function LiftedSessionTab(props: { tab: SessionTab }) {
  return (
    <div className={classes(styles.tab, styles.lifted)}>
      <span className={styles.link}>
        <TabFace tab={props.tab} />
      </span>
    </div>
  )
}
