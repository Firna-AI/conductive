import type { Viewport } from '@mokly/mokly'
import { pricingPageCopy } from '../../../../src/marketing/pricing'
import { classes } from '../components/common/classes'
import { ClosingCall } from '../components/marketing/ClosingCall'
import { SitePage } from '../components/marketing/SitePage'
import { HoursRules } from '../components/pricing/HoursRules'
import { PlanCards } from '../components/pricing/PlanCards'
import { PricingIntro } from '../components/pricing/PricingIntro'
import { paths } from '../paths'
import styles from './PricingScreen.module.css'

/**
 * The pricing page of the site: the plans with their prices and cloud
 * hours, the currency and tax line, how cloud hours count, and the last call
 * to action with the actions of the site. The header marks Pricing as the
 * current page. The plans and the words come from `src/marketing/pricing.ts`,
 * the module that the site also reads. The column takes the width of the
 * site header, so the four plans fit side by side.
 */
export function PricingScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  return (
    <SitePage current="pricing" viewport={viewport}>
      <div
        className={classes(styles.page, viewport === 'mobile' && styles.mobile)}
      >
        <div className={styles.top}>
          <PricingIntro viewport={viewport} />
          <PlanCards viewport={viewport} />
        </div>
        <HoursRules viewport={viewport} />
        <ClosingCall
          signIn={paths.signIn}
          text={pricingPageCopy.closing.text}
          title={pricingPageCopy.closing.title}
          viewport={viewport}
        />
      </div>
    </SitePage>
  )
}
