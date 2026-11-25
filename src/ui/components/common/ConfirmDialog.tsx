import type { ReactNode } from 'react'
import type { Viewport } from './viewport'
import { classes } from './classes'
import { Sheet } from './Sheet'
import styles from './ConfirmDialog.module.css'
import card from './ModalCard.module.css'

/**
 * The dialog of the app, drawn open: a question that the user confirms
 * before an action, or a short form, such as Send feedback. Desktop shows
 * a dialog over the dimmed app, and a phone shows a sheet. The actions come
 * last, with the confirming action at the end. A form with a message box
 * takes the `wide` dialog on desktop. A dialog taller than the room of the
 * window keeps its title and its actions, and its content scrolls between
 * them.
 *
 * The title of a phone sheet takes one line, with an ellipsis when it is
 * longer, and a desktop title wraps between words. `wrapTitle` shows the
 * whole title on both: the sheet gives it more lines, and a word longer
 * than a line breaks. A question whose title is the only place that names
 * its subject, such as a repository, gives it.
 */
export function ConfirmDialog(props: {
  title: string
  viewport: Viewport
  children: ReactNode
  actions: ReactNode
  wide?: boolean
  wrapTitle?: boolean
}) {
  if (props.viewport === 'mobile') {
    return (
      <Sheet title={props.title} wrapTitle={props.wrapTitle}>
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
        className={classes(styles.dialog, card.card, props.wide && styles.wide)}
        role="dialog"
      >
        <h2
          className={classes(
            styles.title,
            card.head,
            props.wrapTitle && styles.wrapTitle,
          )}
        >
          {props.title}
        </h2>
        <div className={classes(styles.body, card.body)}>{props.children}</div>
        <div className={classes(styles.actions, card.foot)}>
          {props.actions}
        </div>
      </section>
    </div>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}
