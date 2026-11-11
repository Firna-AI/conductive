import type { ComponentProps, ComponentPropsWithRef, Ref } from 'react'
import { FileText, X } from 'lucide-react'
import styles from '../../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import type { ConductorOldDocument } from '../../../shared/conductor-import'
import { nameLabel } from '../../../shared/name-label'
import { IconButton } from '../../../files/ui/actions'
import { classes } from '../../../files/ui/classes'
import { focusClass } from '../../../files/ui/layout'
import { AppLink } from '../../ui/AppLink'

/**
 * The name of an old session from Conductor, as its tab, its page, and its
 * links show it: its title, Untitled without one, or a general name while
 * the list of the old sessions has not come.
 */
export function documentName(document: ConductorOldDocument | null): string {
  return document ? nameLabel(document.title) : 'Session from Conductor'
}

/** The icon and the name of the tab. */
function DocumentTabLabel(props: { name: string }) {
  return (
    <>
      <FileText aria-hidden className={styles.icon} size={13} />
      <span className={styles.title}>{props.name}</span>
    </>
  )
}

/**
 * The closable tab of an old session from Conductor, for the tab row of the
 * centre column on desktop. It is a list item in the same list as the
 * session tabs, with their styles from the mockups, and a link to the
 * address of its document. `item`, `link`, and `close` take the props of
 * the row, as they do for a file tab: the handlers of a drag and of the
 * tab menu, the ref that gives the focus back, and a press on Close that
 * starts no drag.
 */
export function DocumentTabItem(props: {
  name: string
  href: string
  selected: boolean
  onClose: () => void
  item?: ComponentPropsWithRef<'li'>
  link?: { ref?: Ref<HTMLAnchorElement> }
  close?: ComponentProps<'span'>
}) {
  const { item } = props
  return (
    <li
      {...item}
      className={classes(
        styles.tab,
        props.selected && styles.selected,
        item?.className,
      )}
    >
      <AppLink
        aria-current={props.selected ? 'page' : undefined}
        className={classes(styles.link, focusClass)}
        ref={props.link?.ref}
        title={props.name}
        to={props.href}
      >
        <DocumentTabLabel name={props.name} />
      </AppLink>
      <span {...props.close} className={styles.close}>
        <IconButton
          icon={X}
          label={`Close ${props.name}`}
          onPress={props.onClose}
          quiet
        />
      </span>
    </li>
  )
}

/**
 * The copy of the tab that a drag lifts above the page: its icon and its
 * whole name, with no link and no Close.
 */
export function LiftedDocumentTab(props: { name: string }) {
  return (
    <div className={classes(styles.tab, styles.lifted)}>
      <span className={styles.link}>
        <DocumentTabLabel name={props.name} />
      </span>
    </div>
  )
}
