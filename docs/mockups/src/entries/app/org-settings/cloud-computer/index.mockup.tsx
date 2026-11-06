import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const cloudComputer = defineScreen({
  title: 'Cloud computer',
  description:
    'The shared cloud computer of the org, which every workspace starts from: the last build with its history, the install script, the startup script, and the environment variables.',
  rationale:
    'The user chose one cloud computer for each org on 5 November 2026: it holds every repository of the org, so the org keeps one snapshot, not one per repository. The install script runs only when an admin builds the computer, and the startup script runs at each start and resume. Values of environment variables are write-only, so a secret never reaches the browser. Moved here from the repository settings, because repositories have no settings for now.',
  relatedDocs: [],
  movedFrom: 'app/repository-settings',
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer' },
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
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, sees the last build and its history, both scripts as text, and the names of the environment variables. The tab has no Build computer, no Save script, and no Add variable, and no variable can be changed or deleted. The intro says that only an admin can change the computer.',
      rationale:
        'The user chose option B of decision 57: only admins change the repositories, the scripts, and the environment variables, because a changed script reaches every new sandbox of the org and runs during the turns of other members.',
      props: { viewer: 'member' },
    },
  ],
})
