import type { Viewport } from '@mokly/mokly'
import {
  planCopy,
  pricingPageCopy,
  pricingPlans,
  type PricingPlan,
} from '../../../../../src/marketing/pricing'
import { classes } from '../common/classes'
import { siteIcons } from '../marketing/siteIcons'
import styles from './PlanCards.module.css'

const FactIcon = siteIcons['circle-check']

/**
 * One plan as a quiet box: its name, its price with what the price covers,
 * and what it includes. No plan is marked above the others, and no box has a
 * button, because nobody chooses a plan before billing starts.
 */
function PlanCard(props: { plan: PricingPlan }) {
  const words = planCopy(props.plan)
  return (
    <li className={styles.card}>
      <h2 className={styles.name}>{words.name}</h2>
      <p className={styles.price}>
        <span className={styles.amount}>{words.price}</span>{' '}
        <span className={styles.unit}>{words.unit}</span>
      </p>
      <ul className={styles.facts}>
        {words.facts.map((fact) => (
          <li className={styles.fact} key={fact}>
            <FactIcon aria-hidden className={styles.factIcon} size={15} />
            {fact}
          </li>
        ))}
      </ul>
    </li>
  )
}

/**
 * The plans side by side, then the line on the currency and the tax. A
 * desktop shows four columns, and two columns below 1000 px. A phone stacks
 * the plans.
 */
export function PlanCards(props: { viewport: Viewport }) {
  return (
    <div
      className={classes(
        styles.plans,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <ul className={styles.grid}>
        {pricingPlans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </ul>
      <p className={styles.terms}>
        {pricingPageCopy.currency} {pricingPageCopy.tax}
      </p>
    </div>
  )
}
