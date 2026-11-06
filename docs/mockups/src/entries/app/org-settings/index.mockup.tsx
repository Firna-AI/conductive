import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../screens/OrgSettingsScreen'

export const orgSettings = defineScreen({
  title: 'Org settings',
  description:
    'The settings of an org, in five tabs: General, Repositories, Cloud computer, Boat key, and Members. General holds the name, the initials that the rail shows, and Delete org. The Settings link beside the org name opens them. A member who is not an admin sees no Boat key tab.',
  rationale:
    'An org owns its workspaces, its sections, its repositories, its cloud computer, its Boat key, and its members. The account holds what every org shares, and repositories have no settings for now, as the user chose in decision 21. Delete org stops every cloud computer and hides the org at once, and deletes everything after 7 days unless an admin restores it, as the user chose in decision 30. Members can push their work in that time.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: acmeSettings,
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
