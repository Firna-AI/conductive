import type { Viewport } from '@mokly/mokly'
import { productName } from '../brand'
import { classes } from '../components/common/classes'
import { ClosingCall } from '../components/marketing/ClosingCall'
import { SitePage } from '../components/marketing/SitePage'
import { ParityIntro } from '../components/parity/ParityIntro'
import { ParityOneTable } from '../components/parity/ParityOneTable'
import { paths } from '../paths'
import styles from './FromConductorScreen.module.css'

/**
 * The page of the site for people who move from Conductor Cloud: which of
 * its features work in the product today, which are on the way, and which
 * work differently, in one table with a merged cell for each area. The
 * column takes the width of the site header, because the table has four
 * columns.
 */
export function FromConductorScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  return (
    <SitePage viewport={viewport}>
      <div
        className={classes(styles.page, viewport === 'mobile' && styles.mobile)}
      >
        <ParityIntro viewport={viewport} />
        <ParityOneTable viewport={viewport} />
        <p className={styles.footnote}>
          {productName} is not affiliated with Conductor.
        </p>
        <ClosingCall
          signIn={paths.signIn}
          text="Sign up with GitHub, connect your repositories, and send the first task."
          title="Bring your next task."
          viewport={viewport}
        />
      </div>
    </SitePage>
  )
}
