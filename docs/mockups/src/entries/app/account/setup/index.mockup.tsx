import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../screens/AccountScreen'

export const setup = defineScreen({
  title: 'Not connected yet',
  description:
    'During the first run: the user is signed in with GitHub, but the GitHub App is not installed yet, and neither agent is connected. The avatar in the rail leads here, and the way back leads to Get started.',
  rationale:
    'Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, connections: 'not-connected' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
