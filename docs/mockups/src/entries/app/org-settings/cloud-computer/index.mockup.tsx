import { defineScreen } from '@mokly/mokly'
import {
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const cloudComputer = defineScreen({
  title: 'Cloud computer',
  description:
    'The shared cloud computer of the org, which every workspace starts from: the last build with its history, the install script, the startup script, and the environment variables.',
  rationale:
    'The user chose one cloud computer for each org on 5 November 2026: it holds every repository of the org, so the org keeps one snapshot, not one per repository. The install script runs only when the user builds the computer, and the startup script runs at each start and resume. Values of environment variables are write-only, so a secret never reaches the browser. Moved here from the repository settings, because repositories have no settings for now.',
  relatedDocs: [],
  movedFrom: 'app/repository-settings',
  propSchema: orgSettingsSchema,
  props: { tab: 'computer', build: 'ready' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'building',
      title: 'Building',
      description:
        'A build runs after the user chose Build computer. Its log streams in the card, and workspaces keep starting from the last good build until it finishes.',
      movedFrom: 'app/repository-settings/updating',
      props: { build: 'building' },
    },
    {
      slug: 'build-failed',
      title: 'Build failed',
      description:
        'The install script failed. The card shows the end of the log and offers Try again. Workspaces still start from the last good build, and the Settings link in the sidebar shows a dot.',
      movedFrom: 'app/repository-settings/update-failed',
      props: { build: 'failed' },
    },
    {
      slug: 'script-changed',
      title: 'Install script changed',
      description:
        'The user saved a changed install script. A notice under the script asks for a build, because the script runs only at a build. Workspaces keep the current build until then.',
      props: { build: 'changed' },
    },
  ],
})
