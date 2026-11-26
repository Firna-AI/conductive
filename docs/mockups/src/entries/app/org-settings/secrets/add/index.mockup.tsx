import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const addSecret = defineScreen({
  title: 'Add secret',
  description:
    'Cal, an admin, chose Add secret. The form under the list asks for the name, the description, and the value, and the hint of each field says what it is for. The hint of the name also says to use only letters, digits, and underscores. The switch for all agents starts off, and its hint says that every agent of Acme can then use the secret with no question. Save secret adds the secret and closes the form.',
  rationale:
    'Each secret is its own record with a name, a description, an encrypted value, its creator, and the mark for all agents. The description shows on the card of each request, so members know what they allow. A new secret starts without the mark, so each session asks before its agent uses it. Only admins set the mark (secrets decision 3 B), so the form of a member has no switch, as app/org-settings/secrets/member/add shows. Cal chose on 17 November 2026 that a new name uses only letters, digits, and underscores, so the hint says so before a member saves.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets', secrets: 'add' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'invalid-name',
      title: 'A name with spaces',
      description:
        'Cal typed "Linear API key" as the name and chose Save secret. The form stays open and keeps the name, the description, and the value, which shows as dots. The name field turns red, and its error says to use only letters, digits, and underscores, in the place of its hint.',
      rationale:
        'Cal chose on 17 November 2026 that a new secret name uses only letters, digits, and underscores. The Worker refuses other names, also from an older app. The form keeps each field, so the member changes only the name. The rule covers only new names: a secret with an older name keeps it, as app/org-settings/secrets/replace/invalid-name shows.',
      props: { secrets: 'add-refused' },
    },
  ],
})
