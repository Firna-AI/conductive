import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

export const buildFailed = defineScreen({
  title: 'Build failed',
  description:
    'The install script failed. The card shows the message that the app saved for the build, the end of the log, and Try again. Workspaces still start from the last good build, and the Settings link in the sidebar shows a dot.',
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
        'The app stopped the build at its 60-minute limit, because a postinstall script watched its files and never ended. The card says "Failed after 1h 00m", and its saved message names the limit. The end of the log shows the step that did not end. Try again builds the computer again, and workspaces still start from the last good build.',
      rationale:
        'The user chose option C of decision 128 on 8 November 2026, and asked that the app tell the user of the limit. The message is the saved error of the build, so the design needs no new field.',
      props: { build: 'time-limit' },
    },
    {
      slug: 'ended',
      title: 'Build that an update stopped',
      description:
        'An operator ended the build of Cal for another update of the cloud computer, one that the tab does not list. The card shows a failed build with its saved message, "Another update of the cloud computer stopped this build. Try again.", the end of its log, and Try again. Workspaces still start from the last good build, and the Settings link in the sidebar shows a dot. Try again waits for that update, as app/org-settings/cloud-computer/building/waiting shows.',
      rationale:
        'The user chose switch decision 3 D on 20 November 2026: the switch question can end a build of the org that runs, and that build fails, as a build of a suspended user does. Members do not see the switch (switch decision 2 D), so the message names no provider and no switch. It uses the words of the waiting build, so that Try again reads as the next step.',
      props: { build: 'ended' },
    },
  ],
})
