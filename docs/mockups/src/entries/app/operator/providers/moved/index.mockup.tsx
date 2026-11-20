import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../screens/OperatorProvidersScreen'

export const operatorProvidersMoved = defineScreen({
  title: 'Weights moved',
  description:
    'The operator moved the slider to give e2b 10% of new orgs and boat 90%. Save weights is on. Nothing changes until the operator saves.',
  rationale:
    'Save weights acts at once, with no question, because the weights change only the orgs that are created after the save. One save makes one record of the operator and the time, so a drag of the slider does not record each step. Moved here from a saved state of the Providers page, with the same path, so that the Providers page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: { weights: 'moved', accounts: 'both', signUps: 'open' },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
