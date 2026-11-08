import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const generalForMember = defineScreen({
  title: 'Seen by a member',
  description:
    'Priya, a member who is not an admin, opens the General tab. It shows the name and the initials of Acme without fields and without Save, and says that only an admin can change it. Delete org is not there.',
  rationale:
    'Only admins rename the org, because the admins manage the settings of the org, as decisions 54 and 57 say. The General tab is the canonical screen of the org settings, which has child pages, so this view is a child page of its own.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, viewer: 'member' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
