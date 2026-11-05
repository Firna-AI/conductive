import { CircleX } from 'lucide-react'
import type { TeamBilling } from '../../fixtures/billing'
import { ActionButton } from '../common/actions'
import { Section } from '../settings/Section'
import styles from './Billing.module.css'

/**
 * The ways to end Team, from decision 35, drawn as its recommended option
 * D: Cancel plan ends it at the end of the period, and Withdraw from
 * contract opens the withdrawal that consumers in the EU have the right to.
 * The withdrawal page is not drawn yet.
 */
export function EndPlanSection(props: { billing: TeamBilling }) {
  return (
    <Section
      actions={
        <>
          <ActionButton icon={CircleX} tone="danger">
            Cancel plan
          </ActionButton>
          <a className={styles.withdraw}>Withdraw from contract</a>
        </>
      }
      description={`Team ends on ${props.billing.period.end}, at the end of this billing period.`}
      title="Cancel plan"
    />
  )
}
