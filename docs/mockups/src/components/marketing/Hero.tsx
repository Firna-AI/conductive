import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { screenFrame } from '../../entries/components/marketing/ScreenFrame.mockup'
import type { FramedPicture } from '../../screens/marketingPictures'
import { classes } from '../../../../../src/ui/components/common/classes'
import { SiteActions } from './SiteActions'
import styles from './Hero.module.css'

/**
 * The top of the home page: the headline, one sentence, the two actions,
 * and a real screen of the app as a large picture. On desktop the picture
 * reads its scale from the hero, which follows the width of the page.
 */
export function Hero(props: {
  title: string
  text: string
  signIn: string
  picture: FramedPicture
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  const { picture } = props
  return (
    <section className={classes(styles.hero, mobile && styles.mobile)}>
      <div className={styles.copy}>
        <h1 className={styles.title}>{props.title}</h1>
        <p className={styles.text}>{props.text}</p>
        <SiteActions place="hero" stack={mobile} to={props.signIn} />
      </div>
      <div className={styles.picture}>
        <screenFrame.Component
          device={picture.device}
          moklyInstance={picture.key}
          picture={picture.picture}
          screen={picture.screen}
        />
      </div>
    </section>
  )
}
