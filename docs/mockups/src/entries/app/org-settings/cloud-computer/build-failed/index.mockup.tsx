import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const buildFailed = defineScreen({
  title: 'Build failed',
  description:
    'The install script failed. The card shows the message that the app saved for the build, the end of the log, and Try again. Workspaces still start from the last good build, and the Settings link in the sidebar shows a dot. The closed history lists the failed build on top.',
  rationale:
    'A failed build keeps the last good build, as decision 9 says. The app shows the saved message of every failed build, because a build that passed its time limit has no field of its own (decision 128). Moved here from a saved state of the Cloud computer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  movedFrom: 'app/repository-settings/update-failed',
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', build: 'failed' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'time-limit',
      title: 'Build time limit',
      description:
        'The app stopped the build at its 60-minute limit, because a postinstall script watched its files and never ended. The card says "Failed after 1h 00m", and its saved message names the limit. The end of the log shows the step that did not end. Try again builds the computer again, and workspaces still start from the last good build. The closed history lists the stopped build on top.',
      rationale:
        'The user chose option C of decision 128 on 8 November 2026, and asked that the app tell the user of the limit. The message is the saved error of the build, so the design needs no new field.',
      props: { build: 'time-limit' },
    },
  ],
})
