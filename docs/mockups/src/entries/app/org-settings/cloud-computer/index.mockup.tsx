import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const cloudComputer = defineScreen({
  title: 'Cloud computer',
  description:
    'The shared cloud computer of the org, which every workspace starts from: the last build with its history, the install script, the startup script, and the environment variables. Each variable has a Secret switch, and a note under the list says what the mark does and when a change applies.',
  rationale:
    'The user chose one cloud computer for each org on 5 November 2026: it holds every repository of the org, so the org keeps one snapshot, not one per repository. The install script runs only when an admin builds the computer, and the startup script runs at each start and resume. Values of environment variables are write-only, so a secret never reaches the browser. The user chose option C of decision 133 on 8 November 2026: the app hides only the values that an admin marks as secret in agent output and start logs, so ordinary values such as a site address stay readable. Moved here from the repository settings, because repositories have no settings for now. The states of the tab are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  movedFrom: 'app/repository-settings',
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
