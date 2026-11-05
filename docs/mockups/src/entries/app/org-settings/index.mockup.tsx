import { defineScreen } from '@mokly/mokly'
import {
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../screens/OrgSettingsScreen'

export const orgSettings = defineScreen({
  title: 'Org settings',
  description:
    'The settings of an org, in three tabs: General, Repositories, and Cloud computer. General holds the name, the initials that the rail shows, and Delete org. The Settings link beside the org name opens them.',
  rationale:
    'An org owns its workspaces, its sections, its repositories, and its cloud computer. The account holds what every org shares, and repositories have no settings for now. Waits on decision 21, drawn as its recommended option A. What Delete org does with work that is not pushed waits on decision 16.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { tab: 'general', build: 'ready' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
