import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { classes } from '../../../../../src/ui/components/common/classes'
import { SiteActions } from './SiteActions'
import styles from './ClosingCall.module.css'

/** The last call to action of the page, before the footer. */
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
      <SiteActions place="closing" stack={mobile} to={props.signIn} />
    </section>
  )
}
