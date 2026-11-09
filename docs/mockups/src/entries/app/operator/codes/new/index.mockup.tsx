import { defineScreen } from '@mokly/mokly'
import {
  OperatorCodesScreen,
  operatorCodesSchema,
} from '../../../../../screens/OperatorCodesScreen'

export const operatorCodesNew = defineScreen({
  title: 'New code',
  description:
    'New code opens a dialog with a label and a use limit. The label is only for operators, and the use limit says how many people the code lets in. Make code adds the code that the app made.',
  rationale:
    'The operator chooses the label and the limit. The app makes the code itself, at random, so that nobody can guess it, and a code check needs no limit on attempts. A code has no end date.',
  relatedDocs: [],
  propSchema: operatorCodesSchema,
  props: { list: 'newest', dialog: 'new', signUps: 'open' },
  render: (props, context) => (
    <OperatorCodesScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'made',
      title: 'Code made',
      description:
        'The new code leads the list, newest first, with no uses yet. Copy beside the code copies it to share.',
      props: { list: 'made', dialog: 'none' },
    },
  ],
})
