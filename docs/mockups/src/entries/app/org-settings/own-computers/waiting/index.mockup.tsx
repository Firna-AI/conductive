import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const waitingComputer = defineScreen({
  title: 'Waiting to connect',
  description:
    'Cal closed Add computer before build-03 connected. Its row stays at the end of the list with Waiting to connect, the line Not connected yet, and the time that its one-time code still works. Show command opens the install command again, so Cal can run it on the server later. build-03 has no page until it connects.',
  rationale:
    'The install can take some minutes on the server, so Close must not end the add. The code works once, within 1 hour, so a stolen copy of an old command cannot connect a server to the org. The rows of the other computers do not change.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'own-computers', ownComputers: 'waiting' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'expired',
      title: 'Code expired',
      description:
        'build-03 did not connect within 1 hour, so its code expired. Its row says Code expired, and New code opens the install command with a new code.',
      rationale:
        'A new code replaces the expired one, and the name stays, so Cal does not add the computer again.',
      props: { ownComputers: 'expired' },
    },
  ],
})
