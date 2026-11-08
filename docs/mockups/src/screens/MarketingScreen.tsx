import type { Viewport } from '@mokly/mokly'
import { classes } from '../components/common/classes'
import { ClosingCall } from '../components/marketing/ClosingCall'
import { FeatureGrid } from '../components/marketing/FeatureGrid'
import { FeatureSection } from '../components/marketing/FeatureSection'
import { Hero } from '../components/marketing/Hero'
import { SitePage } from '../components/marketing/SitePage'
import { paths } from '../paths'
import { features, smallerFeatures } from './marketingFeatures'
import { marketingPicture } from './marketingPictures'
import styles from './MarketingScreen.module.css'

/**
 * The home page of the marketing site, public at the root of the product
 * domain: the hero with the app, the features with real screens, the
 * smaller features, and a last call to action. Every picture is
 * a real screen of the catalogue, and none of it links into the app.
 */
export function MarketingScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  const hero = marketingPicture('hero', viewport)
  return (
    <SitePage viewport={viewport}>
      <Hero
        device={hero.device}
        picture={hero.picture}
        signIn={paths.signIn}
        text="Agents powered by Claude and Codex work on their own branch, in a full clone of your repository. You follow along and review the work from any browser."
        title="Give every coding task its own cloud computer."
        viewport={viewport}
      />
      <div
        className={classes(styles.sections, mobile && styles.mobile)}
        id="features"
      >
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
    </SitePage>
  )
}
