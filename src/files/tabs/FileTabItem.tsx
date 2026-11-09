import type { ComponentProps, ComponentPropsWithRef } from 'react'
import { X } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { splitPath, type FilesNavigation, type FilesTab } from '../navigation'
import { FileIcon } from '../panel/file-icons'
import { IconButton } from '../ui/actions'
import { FilesLink } from '../ui/FilesLink'
import { classes } from '../ui/classes'

/** The icon and the file name of a tab. */
function FileTabLabel(props: { tab: FilesTab }) {
  const { tab } = props
  return (
    <>
      <FileIcon
        className={styles.icon}
        diff={tab.kind === 'diff'}
        path={tab.path}
        size={13}
      />
      <span className={styles.title}>{splitPath(tab.path).name}</span>
    </>
  )
}

/**
 * The closable tab of an open file or diff, for the tab row of the centre
 * column on desktop. It is a list item, so the shell puts it in the same
 * list as the session tabs, and it takes their styles from the mockups. The
 * tab is a link to its own address. `item` takes more props of the list
 * item, such as the handlers, the classes, and the ref of a drag of the row.
 * `close` takes props of the wrapper of the Close button, such as a press
 * handler that keeps a press on Close from starting a drag.
 */
export function FileTabItem(props: {
  tab: FilesTab
  selected: boolean
  navigation: FilesNavigation
  onClose: () => void
  item?: ComponentPropsWithRef<'li'>
  close?: ComponentProps<'span'>
}) {
  const { tab, item } = props
  const { name } = splitPath(tab.path)
  const diff = tab.kind === 'diff'
  return (
    <li
      {...item}
      className={classes(
        styles.tab,
        props.selected && styles.selected,
        item?.className,
      )}
    >
      <FilesLink
        aria-current={props.selected ? 'page' : undefined}
        aria-label={diff ? `${name} changes` : undefined}
        className={styles.link}
        navigation={props.navigation}
        title={tab.path}
        to={tab}
      >
        <FileTabLabel tab={tab} />
      </FilesLink>
      <span {...props.close} className={styles.close}>
        <IconButton
          icon={X}
          label={`Close ${diff ? `${name} changes` : name}`}
          onPress={props.onClose}
          quiet
        />
      </span>
    </li>
  )
}

/**
 * The copy of a file or diff tab that a drag lifts above the page: its icon
 * and its whole file name, with no link and no Close.
 */
export function LiftedFileTab(props: { tab: FilesTab }) {
  return (
    <div className={classes(styles.tab, styles.lifted)}>
      <span className={styles.link}>
        <FileTabLabel tab={props.tab} />
      </span>
    </div>
  )
}
