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
  variants: [
    {
      slug: 'repositories-changed',
      title: 'Repositories changed, seen by a member',
      description:
        'Priya opens the tab after the build of acme/admin-dashboard failed. The notice under the intro says that acme/admin-dashboard is ready after a build succeeds, and that an admin can try the build again. The notice and the card have no Try again.',
      rationale:
        'The user chose option C of decision 241 on 10 November 2026: the repository notice shows on the Cloud computer tab for admins and members. Only an admin builds the computer (decision 57), so a member reads who can act, as on the Repositories tab. On this tab the notice has no button for anyone, because the build card has the action, and the card of a member has none.',
      props: { repositoryChange: 'added', build: 'failed' },
    },
  ],
})
