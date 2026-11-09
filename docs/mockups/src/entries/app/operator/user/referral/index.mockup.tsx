import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserReferral = defineScreen({
  title: 'Disable a referral code',
  description:
    'Disable code on the referral code of a user asks first. The question names the code, says that the people who used it keep their app access, and says that Disable is final.',
  rationale:
    'The operator can disable a referral code that leaked or that an abuser shares. Disable is final, as for an invite code.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'active', dialog: 'disable' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'disabled',
      title: 'Code disabled',
      description:
        'The referral code shows Disabled, with the time and the operator of the disable, and no Disable code. The people who used it stay listed.',
      props: { page: 'codeDisabled', dialog: 'none' },
    },
  ],
})
