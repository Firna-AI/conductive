import { defineScreen } from '@mokly/mokly'
import {
  OperatorCodesScreen,
  operatorCodesSchema,
} from '../../../../../screens/OperatorCodesScreen'

export const operatorCodesDisable = defineScreen({
  title: 'Disable a code',
  description:
    'Disable on a row asks first. The question names the code, says that it stops working now and that the people who used it keep their app access, and says that Disable is final. The operator makes a new code instead.',
  rationale:
    'Disable is final, so that a wrong click cannot bring back a code that leaked. A use that the code already gave stays.',
  relatedDocs: [],
  propSchema: operatorCodesSchema,
  props: { list: 'newest', dialog: 'disable', signUps: 'open' },
  render: (props, context) => (
    <OperatorCodesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'disabled',
      title: 'Code disabled',
      description:
        'Meetup Lisbon now shows Disabled, with its uses, and no Disable. A disabled code stays in the list.',
      props: { list: 'disabled', dialog: 'none' },
    },
  ],
})
