import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../../screens/OperatorUserScreen'

export const operatorUserAccessReferralCode = defineScreen({
  title: 'Referral code',
  description:
    '@tide-sam came in with the referral code of @dana-k, whose login opens her page. A user who came in by a referral has a referral code too, here with one use.',
  rationale:
    'Moved here from a saved state of the Ways in page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'referralCode', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
})
