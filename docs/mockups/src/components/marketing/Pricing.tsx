import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Check } from 'lucide-react'
import {
  planKeys,
  plans,
  standardMachine,
  type Plan,
  type PlanKey,
} from '../../fixtures/plans'
import { classes } from '../common/classes'
import { SectionIntro } from './SectionIntro'
import { StartButton } from './SiteActions'
import styles from './Pricing.module.css'

function PlanCard(props: { plan: Plan; footer: ReactNode }) {
  const { plan } = props
  return (
    <li className={styles.card}>
      <h3 className={styles.name}>{plan.name}</h3>
      <p className={styles.price}>
        <span className={styles.amount}>{plan.price}</span>
        <span className={styles.unit}>{plan.unit}</span>
      </p>
      <ul aria-label={`${plan.name} includes`} className={styles.includes}>
        {plan.includes.map((line) => (
          <li className={styles.line} key={line}>
            <Check aria-hidden className={styles.check} size={14} />
            {line}
          </li>
        ))}
      </ul>
      <div className={styles.footer}>{props.footer}</div>
    </li>
  )
}

/**
 * The two plans side by side, or under each other on a phone. Free starts
 * the GitHub sign-up. An org upgrades to Team from the app.
 */
export function Pricing(props: {
  id: string
  signIn: string
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  const machine = `${standardMachine.cpus} vCPU and ${standardMachine.memoryGb} GB of memory`
  const footers: Readonly<Record<PlanKey, ReactNode>> = {
    free: <StartButton block size="lg" to={props.signIn} />,
    team: <p className={styles.note}>Upgrade the org from the app.</p>,
  }
  return (
    <section
      className={classes(styles.pricing, mobile && styles.mobile)}
      id={props.id}
    >
      <SectionIntro
        label="Pricing"
        text={`Every workspace runs on the standard machine, with ${machine}. Agents use each member's own Claude and OpenAI accounts.`}
        title="Start free. Upgrade when you need more."
        viewport={props.viewport}
      />
      <ul className={styles.plans}>
        {planKeys.map((key) => (
          <PlanCard footer={footers[key]} key={key} plan={plans[key]} />
        ))}
      </ul>
    </section>
  )
}
