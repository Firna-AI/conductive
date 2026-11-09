import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const computerMember = defineScreen({
  title: 'Seen by a member',
  description:
    'Priya, a member who is not an admin, sees the last build and its history, both scripts as text, and the names of the environment variables with the Secret mark of each secret one. The tab has no Build computer, no Save script, and no Add variable. No variable can be changed or deleted, and no mark has a switch. The intro says that only an admin can change the computer.',
  rationale:
    'The user chose option B of decision 57: only admins change the repositories, the scripts, and the environment variables, because a changed script reaches every new sandbox of the org and runs during the turns of other members. A member sees which values are secret, because the app hides only those in agent output and start logs (decision 133). Moved here from a saved state of the Cloud computer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', viewer: 'member' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
