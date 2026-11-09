import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const firstBuildComputer = defineScreen({
  title: 'First build',
  description:
    'The Cloud computer tab of Firna, the new org of the sign-up, while its first build runs. Create org started the build with the two repositories of Firna. Its log streams in the card, and the note under it says that workspaces start from this build when it finishes, with the 60-minute limit. The install script and the startup script are empty, and Firna has no environment variables yet, as for every new org.',
  rationale:
    'The user chose option C of decision 150 on 8 November 2026. The first build is a normal build with Cal, who created the org, as its starter, so its log and history show on this tab. Firna has no good build yet, so the note names no earlier build, and the history shows once a build has ended.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', org: 'new', build: 'building' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'First build failed',
      description:
        'The first build of Firna failed at a short network fault. The card shows the message that the app saved for the build, the end of its log, and Try again. No note names a build that workspaces still start from, because Firna has none, and the history lists the failed build. The Settings link in the sidebar shows a dot.',
      rationale:
        'A failure gets Try again and no automatic retry, as decision 12 says. Get started and New workspace link an admin here after a failed first build, as app/sign-in/get-started/build-failed and app/new-workspace/first-build/failed show.',
      props: { build: 'failed' },
    },
    {
      slug: 'no-build',
      title: 'No build yet',
      description:
        'Firna has repositories but no build, such as after a first build that did not start. The card says No build yet, with Build computer, and says that workspaces start from the first build.',
      rationale:
        'When the first build cannot start, Create org still succeeds and the Worker writes a warning, so the tab offers Build computer. New workspace links an admin here, as app/new-workspace/first-build/no-build shows.',
      props: { build: 'none' },
    },
    {
      slug: 'script-changed',
      title: 'Script saved during the first build',
      description:
        'Cal saved an install script while the first build of Firna runs. The field shows the saved script, and the notice under it says that one more build runs it when this build succeeds. The notice has no Build computer, because that build starts by itself.',
      rationale:
        'The user chose option E of decision 151 on 9 November 2026. A build runs the settings that it started with, so the Worker starts one more build when the first good build ends below the current settings. A failed first build gets Try again, which builds the current settings, so the words name a build that succeeds. After the first good build, a change needs Build computer, as app/org-settings/cloud-computer/script-changed shows.',
      props: { script: 'changed' },
    },
  ],
})
