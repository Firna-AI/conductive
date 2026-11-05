import { ArrowUpRight } from 'lucide-react'
import { poolHours, seatPrice } from '../../fixtures/billing'
import { firnaMembers } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { Section } from '../settings/Section'
import { TeamTerms } from './TeamTerms'

/**
 * The upgrade of the free org to Team. Each member takes a seat, so the
 * price is the members times $30, and a free org has one member. Continue
 * to payment hands off to Stripe Checkout, which comes back to the billing
 * tab when the payment is done.
 */
export function UpgradeSection() {
  const org = orgs.firna
  return (
    <Section
      actions={
        <>
          <ScreenLink asChild to={paths.billingFree}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.upgraded}>
            <ActionButton icon={ArrowUpRight} tone="primary">
              Continue to payment
            </ActionButton>
          </ScreenLink>
        </>
      }
      description={`Each member takes a seat at $${seatPrice} a month and adds about ${poolHours(1)} hours of compute. An invite adds a seat when the person accepts it.`}
      title={`Upgrade ${org.name} to Team`}
    >
      <TeamTerms after="come back to this page" members={firnaMembers.length} />
    </Section>
  )
}
