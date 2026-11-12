import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../screens/OperatorProvidersScreen'

export const operatorProvidersOneAccount = defineScreen({
  title: 'One account',
  description:
    'The settings of the Worker have the boat account only, as before the e2b account is set. Only a configured account can have a weight, so the box has no slider: a line says that boat gets every new org. Orgs by account lists boat with every org.',
  rationale:
    'Moved here from a saved state of the Providers page, with the same path, so that the Providers page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: { weights: 'default', accounts: 'boat-only', signUps: 'open' },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
