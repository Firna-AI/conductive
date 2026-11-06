import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const boatKey = defineScreen({
  title: 'Boat key',
  description:
    'The Boat key of Acme, saved and tested. The app shows only its last four characters, the one Boat environment that it is limited to, and who added it when. An admin can replace the key or remove it.',
  rationale:
    'Each org has one Boat key, which an admin adds, and every cloud computer of the org runs on its Boat account, as the user chose in decision 46. This screen names Boat and links to its sign-up and its dashboard, as the user chose in decision 47. The key is stored encrypted, never goes back to the browser, and is tested once when it is saved, as the agent calls of decision 44 say. Members do not see the tab, because only an admin adds the key.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'boat-key' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'empty',
      title: 'No key yet',
      description:
        'Acme has no key, for example because an admin removed it. The tab says how to make one in the Boat dashboard, with custom actions and limited to one environment, and lists the actions in one block to copy. It links to the Boat sign-up and dashboard. Save and test checks the key once.',
      rationale:
        'Boat has a ci preset, but it deletes only the sandboxes that its own key created. So the screen asks for custom actions in its place, as an agent call of Milestone 4 on 6 November 2026 says.',
      props: { boatKey: 'empty' },
    },
    {
      slug: 'failed',
      title: 'Test failed',
      description:
        'The pasted key failed its test, because it lacks the sandbox.resume action, so it cannot resume a cloud computer. The field keeps the key, and the notice says how to make a new one.',
      props: { boatKey: 'failed' },
    },
    {
      slug: 'other-account',
      title: 'Key of another account',
      description:
        'An admin tried to replace the key with one of another Boat account. The app refuses it and says why: the cloud computers of Acme are in the account of the saved key. The saved key stays in use.',
      rationale:
        'The user chose option A of decision 56: a new key must reach the same Boat account as the old key, so that no cloud computer and no unpushed work is left out of reach. An admin who wants another Boat account can create a new org.',
      props: { boatKey: 'other-account' },
    },
  ],
})
