import { CircleAlert } from 'lucide-react'
import {
  count,
  dollars,
  firnaMinutes,
  overageCost,
  poolHours,
  type TeamBilling,
} from '../../fixtures/billing'
import { freePlan, resets } from '../../fixtures/limits'
import { StatusText } from '../common/StatusText'
import { UsageMeter, type MeterTone } from '../common/UsageMeter'
import { Section } from '../settings/Section'
import styles from './Billing.module.css'

/** Use from this share of the pool on shows the meter as near its end. */
const nearShare = 0.8

function toneFor(used: number, included: number): MeterTone {
  return used / included >= nearShare ? 'warning' : 'normal'
}

/** The amount used, large, and what the plan includes, muted. */
function Figure(props: { used: number; included: number; unit: string }) {
  return (
    <p className={styles.figure}>
      <span className={styles.used}>{count(props.used)}</span>
      <span className={styles.of}>
        of {count(props.included)} {props.unit}
      </span>
    </p>
  )
}

/**
 * The compute of a Team org in its billing period, against the pool of its
 * seats, with the cost of the use beyond the pool so far.
 */
export function TeamCompute(props: { billing: TeamBilling }) {
  const { billing } = props
  const pool = poolHours(billing.seats)
  const over = Math.max(billing.usedHours - pool, 0)
  const valueText = `${count(billing.usedHours)} of ${count(pool)} hours`
  return (
    <Section
      description={`This period, ${billing.period.start} to ${billing.period.end}. Each seat adds about ${poolHours(1)} hours on the standard machine, and builds of the cloud computer count too.`}
      status={
        over > 0 ? (
          <StatusText icon={CircleAlert} label="Over the pool" tone="warning" />
        ) : undefined
      }
      title="Compute"
    >
      <Figure included={pool} unit="hours" used={billing.usedHours} />
      <UsageMeter
        label="Compute this period"
        max={pool}
        tone={over > 0 ? 'warning' : toneFor(billing.usedHours, pool)}
        value={billing.usedHours}
        valueText={valueText}
      />
      <p className={styles.line}>
        {over > 0
          ? `${count(over)} hours over the pool: ${dollars(overageCost(over))} so far, at cost plus 10%.`
          : `${count(pool - billing.usedHours)} hours left in the pool. More use costs cost plus 10%.`}
      </p>
    </Section>
  )
}

/** The free minutes of this month, which renew on the first of the next. */
export function FreeCompute() {
  const { used } = firnaMinutes
  const included = freePlan.minutes
  return (
    <Section
      description={`${firnaMinutes.month}. Builds of the cloud computer count too.`}
      title="Compute"
    >
      <Figure included={included} unit="minutes" used={used} />
      <UsageMeter
        label="Free minutes this month"
        max={included}
        tone={toneFor(used, included)}
        value={used}
        valueText={`${count(used)} of ${count(included)} minutes`}
      />
      <p className={styles.line}>
        {count(included - used)} minutes left. They renew on {resets.minutes}.
      </p>
    </Section>
  )
}
