import { defineScreen } from '@mokly/mokly'
import {
  OperatorScreen,
  operatorSchema,
} from '../../../../screens/OperatorScreen'

export const operatorError = defineScreen({
  title: 'Numbers not loaded',
  description:
    'The numbers of the operator page could not load. The notice says so, and Try again reads them again. The page shows no old numbers.',
  rationale:
    'A count that the page could not read is not zero, so the page shows no number until a read works.',
  relatedDocs: [],
  propSchema: operatorSchema,
  props: { numbers: 'error', signUps: 'open', waitlist: 'on' },
  render: (props, context) => (
    <OperatorScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The page while it reads the numbers. The boxes and their titles are in place, with placeholders where the numbers come, so nothing moves when they arrive.',
      props: { numbers: 'loading' },
    },
  ],
})
