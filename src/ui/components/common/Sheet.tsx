import type { ReactNode } from 'react'
import { classes } from './classes'
import styles from './Sheet.module.css'

/**
 * A sheet that rises from the bottom of a phone screen over a dimmed page,
 * for a menu that a phone opens in place of a desktop menu. Its title takes
 * one line, with an ellipsis when it is longer. `wrapTitle` gives it more
 * lines in place of the ellipsis, for a title that is the only place where
 * the sheet names its subject, such as a repository in a question.
 */
export function Sheet(props: {
  title: string
  children: ReactNode
  wrapTitle?: boolean
}) {
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} />
      <section aria-label={props.title} className={styles.sheet} role="dialog">
        <span aria-hidden className={styles.handle} />
        <h2
          className={classes(styles.title, props.wrapTitle && styles.wrapTitle)}
        >
          {props.title}
        </h2>
        <div className={styles.body}>{props.children}</div>
      </section>
    </div>
  )
}
