import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const suspendedOrgLeave = defineScreen({
  title: 'Leave a suspended org',
  description:
    "Priya, a member who is not an admin, opens the General tab of Acme after the operator suspended it. The notice of the org is at the top. The name and the initials are read-only, and Leave org is the one action. It says that Priya can no longer open Acme, and that Priya's workspaces stay in it.",
  rationale:
    'Nothing in a suspended org can change, but a member can still leave it, by the last-admin rule of decision 123. A member who is not an admin can always leave, so the General tab of Priya offers Leave org. Cal is the only admin of Acme, so the General tab of Cal, in app/orgs/suspended/settings, offers no Leave org. An org in use shows no Leave org on these screens.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, viewer: 'member', org: 'suspended' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'confirm',
      title: 'Confirm the leave',
      description:
        "Priya confirms Leave org. The dialog says that Priya can no longer open Acme or read its chats, and that Priya's 2 workspaces stay in Acme. On a phone it is a sheet.",
      rationale:
        'A leave cannot simply be undone, because no admin can invite a person while the org is suspended. So the app asks first. The workspaces of a member who leaves move to the earliest active admin, as the rules of a leave say.',
      props: { dialog: 'leave-org' },
    },
  ],
})
