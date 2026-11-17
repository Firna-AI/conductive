import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const setup = defineScreen({
  title: 'Not connected yet',
  description:
    'During the first run: the user is signed in with GitHub, but the GitHub App is not installed yet, and neither agent is connected. The invite code has all 5 invites left. The avatar in the rail leads here, and the way back leads to Get started.',
  rationale:
    'Moved here from a saved state of the Account page, with the same path, so that page shows only its canonical screen. Get started opens only after app access, and app access comes with an invite code, so a new user can share the link before the first run ends.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, connections: 'not-connected' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'agents',
      title: 'No agent connected yet',
      description:
        'The Agents tab during the first run: neither Claude nor Codex is connected, so each agent shows Connect.',
      rationale:
        'The agents have their own tab, so the first run shows them there, not on General.',
      props: { tab: 'agents' },
    },
  ],
})
