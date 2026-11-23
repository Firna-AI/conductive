import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { pricingPageCopy } from '../../../../../src/marketing/pricing'
import { classes } from '../../../../../src/ui/components/common/classes'
import styles from './PricingIntro.module.css'

/**
 * The top of the pricing page: the label, the title, and one sentence.
 */
export function PricingIntro(props: { viewport: Viewport }) {
  const copy = pricingPageCopy
  return (
    <header
      className={classes(
        styles.intro,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <span className={styles.label}>{copy.label}</span>
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.lead}>{copy.lead}</p>
    </header>
  )
}
