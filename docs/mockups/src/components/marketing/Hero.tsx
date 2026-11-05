import type { Viewport } from '@mokly/mokly'
import { classes } from '../common/classes'
import {
  ScreenFrame,
  type FrameDevice,
  type ScreenPicture,
} from './ScreenFrame'
import { SiteActions } from './SiteActions'
import styles from './Hero.module.css'

/**
 * The top of the home page: the headline, one sentence, the two actions, and
 * a real screen of the app as a large picture. On desktop the picture reads
 * its scale from the hero, which follows the width of the page.
 */
export function Hero(props: {
  title: string
  text: string
  signIn: string
  picture: ScreenPicture
  device: FrameDevice
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <section className={classes(styles.hero, mobile && styles.mobile)}>
      <div className={styles.copy}>
        <h1 className={styles.title}>{props.title}</h1>
        <p className={styles.text}>{props.text}</p>
        <SiteActions stack={mobile} to={props.signIn} />
      </div>
      <div className={styles.picture}>
        <ScreenFrame device={props.device} picture={props.picture} />
      </div>
    </section>
  )
}
