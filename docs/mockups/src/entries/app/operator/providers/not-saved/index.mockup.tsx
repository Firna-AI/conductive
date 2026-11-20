import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../screens/OperatorProvidersScreen'

export const operatorProvidersNotSaved = defineScreen({
  title: 'Save failed',
  description:
    'The save of the weights failed. The slider keeps the weights that the operator chose, a line under it says that they were not saved, and Save weights stays on to try again. New orgs still get the saved weights.',
  rationale:
    'Moved here from a saved state of the Providers page, with the same path, so that the Providers page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: { weights: 'not-saved', accounts: 'both', signUps: 'open' },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
