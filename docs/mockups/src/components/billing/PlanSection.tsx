import { ArrowUpRight, Sparkles } from 'lucide-react'
import { poolHours, seatPrice, type TeamBilling } from '../../fixtures/billing'
import { firnaWorkspaces } from '../../fixtures/freeOrg'
import { freePlan } from '../../fixtures/limits'
import { firnaMembers } from '../../fixtures/members'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { Facts } from '../settings/Facts'
import { Section } from '../settings/Section'
import styles from './Billing.module.css'

function Price(props: { children: string }) {
  return <span className={styles.price}>{props.children}</span>
}

/**
 * The Team plan of an org: its seats, which are its members, the next
 * invoice, and the card. Manage payment opens the Stripe customer portal
 * in a new tab.
 */
export function TeamPlan(props: { billing: TeamBilling; members: number }) {
  const { billing, members } = props
  return (
    <Section
      actions={<ActionButton icon={ArrowUpRight}>Manage payment</ActionButton>}
      status={<Price>{`$${members * seatPrice} a month`}</Price>}
      title="Team"
    >
      <Facts
        items={[
          {
            label: 'Seats',
            value: `${members}, one for each member`,
          },
          { label: 'Next invoice', value: billing.nextInvoice },
          { label: 'Payment', value: `Card ending ${billing.card}` },
        ]}
        label="Plan"
      />
      <p className={styles.line}>
        Manage payment opens Stripe, where you change the card and the tax ID
        and download invoices.
      </p>
    </Section>
  )
}

/** The Free plan of an org, and the way to Team. */
export function FreePlan() {
  return (
    <Section
      actions={
        <ScreenLink asChild to={paths.upgrade}>
          <ActionButton icon={Sparkles} tone="primary">
            Upgrade to Team
          </ActionButton>
        </ScreenLink>
      }
      description={`Team is $${seatPrice} a month for each member, and each member adds about ${poolHours(1)} hours of compute.`}
      status={<Price>$0</Price>}
      title="Free"
    >
      <Facts
        items={[
          {
            label: 'Workspaces',
            value: `${firnaWorkspaces.length} of ${freePlan.workspaces}`,
          },
          {
            label: 'Members',
            value: `${firnaMembers.length} of ${freePlan.members}`,
          },
          { label: 'Cloud computer', value: 'Built by hand' },
        ]}
        label="Plan"
      />
    </Section>
  )
}
