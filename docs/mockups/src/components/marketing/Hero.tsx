import type { Viewport } from '@mokly/mokly'
import { ArrowRight } from 'lucide-react'
import { screenFrame } from '../../entries/components/marketing/ScreenFrame.mockup'
import type { FramedPicture } from '../../screens/marketingPictures'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { SiteActions } from './SiteActions'
import styles from './Hero.module.css'

/** A short link above the headline, to a page that a visitor may want. */
type HeroNotice = { text: string; to: string }

/**
 * The top of the home page: an optional short link, the headline, one
 * sentence, the two actions, and a real screen of the app as a large
 * picture. On desktop the picture reads its scale from the hero, which
 * follows the width of the page.
 */
export function Hero(props: {
  title: string
  text: string
  signIn: string
  picture: FramedPicture
  viewport: Viewport
  notice?: HeroNotice
}) {
  const mobile = props.viewport === 'mobile'
  const { picture } = props
  return (
    <section className={classes(styles.hero, mobile && styles.mobile)}>
      <div className={styles.copy}>
        {props.notice ? (
          <ScreenLink className={styles.notice} to={props.notice.to}>
            {props.notice.text}
            <ArrowRight aria-hidden className={styles.noticeIcon} size={14} />
          </ScreenLink>
        ) : null}
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
