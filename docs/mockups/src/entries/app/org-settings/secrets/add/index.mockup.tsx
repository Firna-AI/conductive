import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const addSecret = defineScreen({
  title: 'Add secret',
  description:
    'Cal, an admin, chose Add secret. The form under the list asks for the name, the description, and the value, and the hint of each field says what it is for. The switch for all agents starts off, and its hint says that every agent of Acme can then use the secret with no question. Save secret adds the secret and closes the form.',
  rationale:
    'Each secret is its own record with a name, a description, an encrypted value, its creator, and the mark for all agents. The description shows on the card of each request, so members know what they allow. A new secret starts without the mark, so each session asks before its agent uses it. Only admins set the mark (secrets decision 3 B), so the form of a member has no switch, as app/org-settings/secrets/member/add shows.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets', secrets: 'add' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
