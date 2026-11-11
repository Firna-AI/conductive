import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const scriptChanged = defineScreen({
  title: 'Install script changed',
  description:
    'The user saved a changed install script. A notice under the script asks for a build, because a refresh runs the install script of the newest good build, not the saved one. Workspaces keep the current build until then.',
  rationale:
    'The user chose option C of decision 241 on 10 November 2026: this notice shows only for a change of the install script. A change of the repositories gets its own notice, as app/org-settings/cloud-computer/repositories-changed shows. Moved here from a saved state of the Cloud computer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', script: 'changed' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
