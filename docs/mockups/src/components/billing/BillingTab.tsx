import { CircleCheck } from 'lucide-react'
import { acmeTeam, firnaTeam } from '../../fixtures/billing'
import { acmeMembers, firnaMembers } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { Notice } from '../common/Notice'
import { FreeCompute, TeamCompute } from './ComputeSection'
import { EndPlanSection } from './EndPlanSection'
import { FreePlan, TeamPlan } from './PlanSection'
import { UpgradeSection } from './UpgradeSection'

/**
 * What the billing tab shows: Acme on Team, Firna on Free, the upgrade of
 * Firna, or Firna on Team, back from Stripe Checkout.
 */
export type BillingView = 'team' | 'free' | 'upgrade' | 'upgraded'

/** The billing of an org: its plan, its compute, and the ways to change. */
export function BillingTab(props: { view: BillingView }) {
  switch (props.view) {
    case 'team':
      return (
        <>
          <TeamPlan billing={acmeTeam} members={acmeMembers.length} />
          <TeamCompute billing={acmeTeam} members={acmeMembers.length} />
          <EndPlanSection billing={acmeTeam} />
        </>
      )
    case 'free':
      return (
        <>
          <FreePlan />
          <FreeCompute />
        </>
      )
    case 'upgrade':
      return <UpgradeSection />
    case 'upgraded':
      return (
        <>
          <Notice
            body="Invite your members from the Members tab."
            icon={CircleCheck}
            title={`${orgs.firna.name} is on Team`}
          />
          <TeamPlan billing={firnaTeam} members={firnaMembers.length} />
          <TeamCompute billing={firnaTeam} members={firnaMembers.length} />
          <EndPlanSection billing={firnaTeam} />
        </>
      )
  }
}
