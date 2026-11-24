import type { ReactNode } from 'react'
import { ScreenLink } from '../common/ScreenLink'
import styles from './SystemAlert.module.css'

/**
 * The words of an alert of the system: its title, its fixed line, and its
 * two answers. The system writes them, so they follow iOS.
 */
export type SystemAlertWords = {
  readonly title: string
  readonly body: string
  /** The first answer, such as Don’t Allow or Cancel. */
  readonly deny: string
  /** The second answer, which the system draws in bold, such as Allow. */
  readonly allow: string
}

/**
 * An alert of the system, over the dimmed screen of the app: its title,
 * its fixed line, and its two answers. It draws the permission alert of
 * notices and the alert before the sign-in of a phone app. It follows iOS
 * in neutral shapes. Each answer links to the screen that shows after it.
 */
function SystemAlert(props: {
  words: SystemAlertWords
  denyTo: string
  allowTo: string
}) {
  const { words } = props
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} />
      <section
        aria-label={words.title}
        aria-modal
        className={styles.alert}
        role="alertdialog"
      >
        <div className={styles.text}>
          <h2 className={styles.title}>{words.title}</h2>
          <p className={styles.body}>{words.body}</p>
        </div>
        <div className={styles.answers}>
          <ScreenLink className={styles.answer} to={props.denyTo}>
            {words.deny}
          </ScreenLink>
          <ScreenLink
            className={`${styles.answer} ${styles.preferred}`}
            to={props.allowTo}
          >
            {words.allow}
          </ScreenLink>
        </div>
      </section>
    </div>
  )
}

/**
 * A screen of the app with an alert of the system over it, such as the
 * permission alert of notices or the alert before the sign-in. The alert
 * lies above every layer of the app, so it covers the whole screen. The
 * screen under it is inert, so no press or keyboard focus reaches it.
 */
export function SystemAlertOver(props: {
  words: SystemAlertWords
  denyTo: string
  allowTo: string
  children: ReactNode
}) {
  return (
    <div className={styles.over}>
      <div className={styles.behind} inert>
        {props.children}
      </div>
      <SystemAlert
        allowTo={props.allowTo}
        denyTo={props.denyTo}
        words={props.words}
      />
    </div>
  )
}
