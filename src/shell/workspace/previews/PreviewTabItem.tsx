import type { ComponentProps, ComponentPropsWithRef, Ref } from 'react'
import { Globe, X } from 'lucide-react'
import styles from '../../../ui/components/workspace/WorkspaceTabs.module.css'
import { classes } from '../../../ui/components/common/classes'
import { IconButton } from '../../../files/ui/actions'
import { AppLink } from '../../ui/AppLink'

/** The globe icon and the label of a Preview tab. */
function PreviewTabLabel(props: { label: string }) {
  return (
    <>
      <Globe aria-hidden className={styles.icon} size={13} />
      <span className={styles.title}>{props.label}</span>
    </>
  )
}

/**
 * The Preview tab of one port, for the tab row of the centre column on
 * desktop (decision 291). It is a list item in the same list as the session
 * and file tabs, with their styles from the shared UI. The tab is a link to
 * the address of its port. It shows the globe icon and the label of the
 * port, such as `3000 next dev`, and its tooltip and spoken name give the
 * full name and the folder. Close removes the tab and ends no preview
 * (decision 289). `item`, `link`, and `close` take the props of the row, as
 * for a file tab.
 */
export function PreviewTabItem(props: {
  /** The port and the cut name of its server, from `previewTabLabel`. */
  label: string
  /** The port, the full name, and the folder, or undefined. */
  description: string | undefined
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
        aria-label={props.description}
        className={styles.link}
        ref={props.link?.ref}
        title={props.description}
        to={props.href}
      >
        <PreviewTabLabel label={props.label} />
      </AppLink>
      <span {...props.close} className={styles.close}>
        <IconButton
          icon={X}
          label={`Close ${props.label}`}
          onPress={props.onClose}
          quiet
        />
      </span>
    </li>
  )
}

/** The copy of a Preview tab that a drag lifts: its icon and its label. */
export function LiftedPreviewTab(props: { label: string }) {
  return (
    <div className={classes(styles.tab, styles.lifted)}>
      <span className={styles.link}>
        <PreviewTabLabel label={props.label} />
      </span>
    </div>
  )
}
