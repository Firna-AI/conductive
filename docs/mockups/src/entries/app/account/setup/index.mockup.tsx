import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../../screens/AccountScreen'

export const accountSetup = defineScreen({
  title: 'Not connected yet',
  description:
    'During the first run: the user is signed in with GitHub, but the GitHub App is not installed yet, and neither agent is connected. The invite code has all 5 invites left. The avatar in the rail leads here, and the way back leads to Get started.',
  rationale:
    'Get started opens only after app access, and app access comes with an invite code. So a new user can share the link before the first run ends.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { connections: 'not-connected', form: 'none', invites: 'left' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
