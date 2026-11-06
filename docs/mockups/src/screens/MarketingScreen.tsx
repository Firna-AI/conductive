import type { Viewport } from '@mokly/mokly'
import { classes } from '../components/common/classes'
import { ClosingCall } from '../components/marketing/ClosingCall'
import { FeatureGrid } from '../components/marketing/FeatureGrid'
import { FeatureSection } from '../components/marketing/FeatureSection'
import { Hero } from '../components/marketing/Hero'
import { SiteFooter } from '../components/marketing/SiteFooter'
import { SiteHeader, type SiteLinks } from '../components/marketing/SiteHeader'
import { paths } from '../paths'
import { features, smallerFeatures } from './marketingFeatures'
import { heroPicture } from './marketingPictures'
import styles from './MarketingScreen.module.css'

const links: SiteLinks = { home: paths.marketing, signIn: paths.signIn }

/** The year of the copyright line. A view reads no clock. */
const year = 2026

/**
 * The home page of the marketing site, public at the root of the product
 * domain: the hero with the app, the features with real screens, the
 * smaller features, and a last call to action. Every picture is
 * a real screen of the catalogue, and none of it links into the app.
 */
export function MarketingScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  return (
    <div className={classes(styles.site, mobile && styles.mobile)}>
      <SiteHeader links={links} viewport={viewport} />
      <main className={styles.main}>
        <Hero
          device={mobile ? 'phone' : 'window'}
          picture={heroPicture(viewport)}
          signIn={paths.signIn}
          text="Agents powered by Claude and Codex work on their own branch, in a full clone of your repository. You follow along and review the work from any browser."
          title="Give every coding task its own cloud computer."
          viewport={viewport}
        />
        <div className={styles.sections} id="features">
          {features(viewport).map((feature) => (
            <FeatureSection
              feature={feature}
              key={feature.key}
              viewport={viewport}
            />
          ))}
          <FeatureGrid
            items={smallerFeatures}
            label="And more"
            text="The app starts and stops the cloud computers for you."
            title="Less to look after."
            viewport={viewport}
          />
          <ClosingCall
            signIn={paths.signIn}
            text="Sign up with GitHub, connect your repositories, and send the first task."
            title="Try it on your next task."
            viewport={viewport}
          />
        </div>
      </main>
      <SiteFooter
        links={links}
        tagline="Coding agents on cloud computers, in your browser."
        viewport={viewport}
        year={year}
      />
    </div>
  )
}
