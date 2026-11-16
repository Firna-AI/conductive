import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

/** Why the tab has a Skills section, and why it comes last. */
const skills =
  'The user chose option B of decision 1 of the org skills repository plan on 13 November 2026: the cloud computer of each workspace copies the skills repository when it starts, and checks it for new commits every 5 minutes. So the description says that agents get its updates within minutes, and the hint says that a changed repository applies at the next start, as a changed env var does. The user changed decision 3 of that plan to option A on 16 November 2026: only the skill folders of the repository load, not a rules file. Only an admin changes the repository, from decision 2 A of that plan. The section comes after the environment variables, because the startup script and the variables set up each start of the computer together, and the skills serve the agents. It shows no state of the last copy, because that plan leaves a status for a later change.'

export const cloudComputer = defineScreen({
  title: 'Cloud computer',
  description:
    'The shared cloud computer of the org, which every workspace starts from: the last build with its history, the install script, the startup script, the environment variables, and the skills repository. Each variable has a Secret switch, and a note under the list says what the mark does and when a change applies. The Skills section at the end holds acme/agent-skills in its Repository field, with a hint that a change applies at the next start of each workspace. Save repository is off until the field changes.',
  rationale: `The user chose one cloud computer for each org on 5 November 2026: it holds every repository of the org, so the org keeps one snapshot, not one per repository. The install script runs only when an admin builds the computer, and the startup script runs at each start and resume. Values of environment variables are write-only, so a secret never reaches the browser. The user chose option C of decision 133 on 8 November 2026: the app hides only the values that an admin marks as secret in agent output and start logs, so ordinary values such as a site address stay readable. ${skills} Moved here from the repository settings, because repositories have no settings for now. The states of the tab are child pages, so this page shows only its canonical screen.`,
  relatedDocs: [],
  movedFrom: 'app/repository-settings',
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
