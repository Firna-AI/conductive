import type { ComponentProps, ComponentPropsWithRef, Ref } from 'react'
import { X } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { labelName } from '../model/file-labels'
import type { FilesNavigation, FilesTab } from '../navigation'
import { FileIcon } from '../panel/file-icons'
import { IconButton } from '../ui/actions'
import { FilesLink } from '../ui/FilesLink'
import { classes } from '../ui/classes'

/**
 * The name of a file or diff tab, as a screen reader reads it from the tab:
 * the file name of the label of its path, or "File" when no record names
 * the file. A diff tab adds "changes", as in "app.ts changes". Other names
 * of the tab, such as in the tab menu of the row, use it too, so each one
 * hides each secret value.
 */
export function fileTabName(tab: FilesTab, label: string | null): string {
  const name = labelName(label)
  return tab.kind === 'diff' ? `${name} changes` : name
}

/** The icon and the name of a tab. */
function FileTabLabel(props: { tab: FilesTab; name: string }) {
  const { tab } = props
  return (
    <>
      <FileIcon
        className={styles.icon}
        diff={tab.kind === 'diff'}
        path={tab.path}
        size={13}
      />
      <span className={styles.title}>{props.name}</span>
    </>
  )
}

/**
 * The closable tab of an open file or diff, for the tab row of the centre
 * column on desktop. It is a list item, so the shell puts it in the same
 * list as the session tabs, and it takes their styles from the mockups. The
 * tab is a link to its own address. It shows the label of its path, or
 * "File" when no record names the file. `item` takes more props of the
 * list item, such as the handlers, the classes, and the ref of a drag and
 * of the tab menu of the row. `link` takes the ref of the link, such as one
 * that gives the tab the focus back after a move. `close` takes props of
 * the wrapper of the Close button, such as a press handler that keeps a
 * press on Close from starting a drag.
 */
export function FileTabItem(props: {
  tab: FilesTab
  /** The label of the path, from `listLabel`, or null. */
  label: string | null
  selected: boolean
  navigation: FilesNavigation
  onClose: () => void
  item?: ComponentPropsWithRef<'li'>
  link?: { ref?: Ref<HTMLAnchorElement> }
  close?: ComponentProps<'span'>
}) {
  const { tab, item } = props
  const name = labelName(props.label)
  const title = fileTabName(tab, props.label)
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
        aria-label={tab.kind === 'diff' ? title : undefined}
        className={styles.link}
        navigation={props.navigation}
        ref={props.link?.ref}
        title={props.label ?? undefined}
        to={tab}
      >
        <FileTabLabel name={name} tab={tab} />
      </FilesLink>
      <span {...props.close} className={styles.close}>
        <IconButton
          icon={X}
          label={`Close ${title}`}
          onPress={props.onClose}
          quiet
        />
      </span>
    </li>
  )
}

/**
 * The copy of a file or diff tab that a drag lifts above the page: its icon
 * and its whole name, with no link and no Close.
 */
export function LiftedFileTab(props: { tab: FilesTab; label: string | null }) {
  return (
    <div className={classes(styles.tab, styles.lifted)}>
      <span className={styles.link}>
        <FileTabLabel name={labelName(props.label)} tab={props.tab} />
      </span>
    </div>
  )
}
