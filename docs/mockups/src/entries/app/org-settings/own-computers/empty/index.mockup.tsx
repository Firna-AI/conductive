import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const noComputers = defineScreen({
  title: 'No own computers',
  description:
    'The Own computers tab of an org without own computers, as Cal, an admin, sees it: the intro, one line that says what an own computer gives, the note that links to the Cloud computer tab, and Add computer. Every org starts here, and its workspaces run on the cloud computer.',
  rationale:
    'The cloud computer stays the default (own computer decision 3 A), so an org needs no own computer, and the tab says what one gives without a push to add one. New workspace shows no computer choice while the org has no own computer.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'own-computers' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The same tab as Priya, a member who is not an admin, sees it: a line says that an admin of Acme can add Linux servers here, and the tab has no Add computer.',
      rationale:
        'Own computer decision 2 A: only admins add own computers. The line names who can, so a member knows whom to ask.',
      props: { viewer: 'member' },
    },
  ],
})
