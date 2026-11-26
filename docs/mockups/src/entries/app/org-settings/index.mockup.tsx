import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../screens/orgSettingsState'

export const orgSettings = defineScreen({
  title: 'Org settings',
  description:
    'The settings of an org, as the Acme group of the Settings dialog, after the Account group: General, Repositories, Cloud computer, Agents, Secrets, and Members. The dialog lies over the workspace list of Acme. On a phone each tab is a screen of its own, with Settings as the way back to the list at app/settings. General holds the name, the initials that the rail shows, the colour of the tile of the open org, and Delete org. The Settings cog beside the org name opens it. A member who is not an admin sees the same tabs.',
  rationale:
    'An org owns its workspaces, its sections, its repositories, its cloud computer, and its members. The account holds what every org shares, and repositories have no settings for now, as the user chose in decision 21. The app runs every cloud computer on its own account, so no org has a key of a cloud computer to manage, as the user chose in decision 80. The Agents tab holds the org logins of the agents, from decision 1 B of the org logins plan, which the user chose on 16 November 2026, as app/org-settings/agents shows. Delete org stops every cloud computer and hides the org at once, and deletes everything after 7 days unless an admin restores it, as the user chose in decision 30. Members can push their work in that time.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: acmeSettings,
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
