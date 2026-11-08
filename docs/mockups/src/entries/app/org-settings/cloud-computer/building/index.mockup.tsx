import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

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
})
