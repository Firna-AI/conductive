import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const building = defineScreen({
  title: 'Building',
  description:
    'A build runs after the user chose Build computer. Its log streams in the card, and workspaces keep starting from the last good build until it finishes. The note under the log says that each build has a 60-minute limit.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026: each whole build and refresh has a 60-minute limit from its start, and the app tells the user of the limit. The note keeps the limit out of the head of the card, beside the build that workspaces use. Moved here from a saved state of the Cloud computer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  movedFrom: 'app/repository-settings/updating',
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', build: 'building' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'waiting',
      title: 'Build that waits',
      description:
        'Cal chose Build computer while another update of the cloud computer runs, one that the tab does not list. His build waits for that update to finish, then runs. The card shows it as a build that runs, with its time from Build computer, and the first line of its log says "Waiting for another update of the cloud computer to finish". The steps of the build follow in the log when the wait ends. Workspaces keep starting from the last good build, and the note names the 60-minute limit, as for every build.',
      rationale:
        'The user chose switch decision 2 D on 20 November 2026: members do not see the switch build of an operator, and a Build computer or Try again of an admin waits until that build ends. The tab shows the wait with the states that it knows, a build that runs, so that older copies of the Mac app show it too. The log already names each step as it starts, so the wait is its first step. The words name no provider and no switch.',
      props: { build: 'waiting' },
    },
  ],
})
