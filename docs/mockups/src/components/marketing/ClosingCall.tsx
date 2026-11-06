import type { Viewport } from '@mokly/mokly'
import { classes } from '../common/classes'
import { BoatNote } from './BoatNote'
import { SiteActions } from './SiteActions'
import styles from './ClosingCall.module.css'

/**
 * The last call to action of the page, before the footer, with the note
 * that a user needs a Boat account.
 */
export function ClosingCall(props: {
  title: string
  text: string
  signIn: string
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <section className={classes(styles.call, mobile && styles.mobile)}>
      <h2 className={styles.title}>{props.title}</h2>
      <p className={styles.text}>{props.text}</p>
      <SiteActions stack={mobile} to={props.signIn} />
      <BoatNote />
    </section>
  )
}
