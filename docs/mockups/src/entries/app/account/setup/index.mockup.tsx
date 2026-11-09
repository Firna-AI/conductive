import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountSchema,
  connectedAccount,
} from '../../../../screens/AccountScreen'

export const accountSetup = defineScreen({
  title: 'Not connected yet',
  description:
    'During the first run: the user is signed in with GitHub, but the GitHub App is not installed yet, and neither agent is connected. The avatar in the rail leads here, and the way back leads to Get started.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...connectedAccount, connections: 'not-connected' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
