import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { classes } from './classes'
import { Sheet } from './Sheet'
import styles from './ConfirmDialog.module.css'

/**
 * A question that the user confirms before an action, drawn open. Desktop
 * shows a dialog over the dimmed app, and a phone shows a sheet. The
 * actions come last, with the confirming action at the end. A wide dialog
 * fits more actions, such as the choices of a command prompt.
 */
export function ConfirmDialog(props: {
  title: string
  viewport: Viewport
  children: ReactNode
  actions: ReactNode
  wide?: boolean
}) {
  if (props.viewport === 'mobile') {
    return (
      <Sheet title={props.title}>
        <div className={styles.sheetBody}>
          {props.children}
          <div className={styles.sheetActions}>{props.actions}</div>
        </div>
      </Sheet>
    )
  }
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} />
      <section
        aria-label={props.title}
        aria-modal
        className={classes(styles.dialog, props.wide && styles.wide)}
        role="dialog"
      >
        <h2 className={styles.title}>{props.title}</h2>
        {props.children}
        <div className={styles.actions}>{props.actions}</div>
      </section>
    </div>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}
