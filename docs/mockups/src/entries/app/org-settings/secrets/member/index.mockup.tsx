import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const secretsForMember = defineScreen({
  title: 'Seen by a member',
  description:
    'Priya, a member who is not an admin, opens the Secrets tab. Every value shows as dots, also of the secrets that she added, and no row has Reveal. FIGMA_TOKEN and VERCEL_TOKEN, which she added, have Replace and Delete. The other rows have no actions. The mark for all agents shows as words on SENTRY_AUTH_TOKEN, without a switch. The note under the list says that she can replace and delete the secrets that she added. Add secret stays.',
  rationale:
    'Secrets decision 3 B: every member adds secrets and uses each one, and a member replaces or deletes only their own. Option A was rejected, because a member could then send the agents of other members to an account that the member controls. Secrets decision 2 A: only admins reveal a value.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets', viewer: 'member' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'add',
      title: 'Add secret, as a member',
      description:
        'Priya chose Add secret. The form asks for the name, the description, and the value, without the switch for all agents.',
      rationale:
        'Only admins set or clear the mark for all agents (secrets decision 3 B), so a new secret of a member needs an answer in each session until an admin marks it.',
      props: { secrets: 'add' },
    },
    {
      slug: 'replace',
      title: 'Replace a secret, as a member',
      description:
        'Priya chose Replace on FIGMA_TOKEN, a secret that she added. The Replace form under the row holds its description, which she can change, and an empty field of a new value, with Save and Cancel.',
      props: { secrets: 'replace' },
    },
  ],
})
