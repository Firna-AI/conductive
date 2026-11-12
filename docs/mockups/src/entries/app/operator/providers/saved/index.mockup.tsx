import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../screens/OperatorProvidersScreen'

export const operatorProvidersSaved = defineScreen({
  title: 'Weights saved',
  description:
    'After Save weights, the slider keeps the new weights, and a line under it says when and by which operator they changed. Save weights is off again.',
  rationale:
    'Each change of the weights records the operator and the time, as the pause of sign-ups and the suspensions do, so the page shows the last change in the same way. Moved here from a saved state of the Providers page, with the same path, so that the Providers page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: { weights: 'saved', accounts: 'both', signUps: 'open' },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
