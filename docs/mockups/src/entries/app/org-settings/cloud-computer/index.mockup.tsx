import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../screens/orgSettingsState'

/** Why the tab has a Skills section, and why it comes last. */
const skills =
  'The user chose option B of decision 1 of the org skills repository plan on 13 November 2026: the cloud computer of each workspace copies the skills repository when it starts, and checks it for new commits every 5 minutes. So the description says that agents get its updates within minutes, and the hint says that a changed repository applies at the next start, as a changed env var does. The user changed decision 3 of that plan to option A on 16 November 2026: only the skill folders of the repository load, not a rules file. Only an admin changes the repository, from decision 2 A of that plan. The section comes after the environment variables, because the startup script and the variables set up each start of the computer together, and the skills serve the agents.'

/** Why the section says that the repository must be public, and lists its skills. */
const skillsList =
  'The user chose option A of decision 6 of that plan on 16 November 2026: the cloud computer copies the repository with no GitHub token, so only a public repository gives skills, and the description says so. The user answered decision 7 of that plan with a new option, H, on the same day: when an admin adds the repository, the section looks it up on GitHub and lists the skills that it finds. The lookup runs at Save and at each load of the section, and nothing stores its list. The list gives the name of each skill folder in name order, without descriptions, because a description needs one more request for each skill. The number of skills heads the list, so that a long list reads at a glance. The list comes from GitHub, not from the copies of the cloud computers, so it shows no state of the last copy, which that plan leaves for a later change.'

/** Why the section has a trust switch, and why it starts off. */
const skillsTrust =
  'The user chose option C of decision 403 of the skills trust plan on 17 November 2026, and approved its design on 18 November 2026: an admin can trust the skills repository, so that Claude runs the commands that its skills run while Claude reads them. Each repository starts untrusted. An untrusted repository also turns these commands off in every skill and custom slash command of the session, so the hint names the skills of the workspace too. The other states of the switch are child pages of app/org-settings/cloud-computer/skills.'

export const cloudComputer = defineScreen({
  title: 'Cloud computer',
  description:
    'The shared cloud computer of the org, which every workspace starts from: the last build with its history, the install script, the startup script, the environment variables, and the skills repository. Each variable has a Secret switch, and a note under the list says what the mark does and when a change applies. The Skills section at the end says that the repository must be public. It holds acme/agent-skills in its Repository field, with a hint that a change applies at the next start of each workspace. Under the field, the switch "Trust this skills repository" is off. Its hint says that Claude runs no automatic commands from any skill or custom slash command, including the workspace\'s own, and that agents can still choose to run commands that a skill suggests. It ends with the note that running cloud computers keep their current trust until their next start or resume, and with "How trust works", which opens the guide. Then "12 skills" heads the names of the skill folders that the lookup found in acme/agent-skills, in name order. Save repository is off until the field or the switch changes.',
  rationale: `The user chose one cloud computer for each org on 5 November 2026: it holds every repository of the org, so the org keeps one snapshot, not one per repository. The install script runs only when an admin builds the computer, and the startup script runs at each start and resume. Values of environment variables are write-only, so a secret never reaches the browser. The user chose option C of decision 133 on 8 November 2026: the app hides only the values that an admin marks as secret in agent output and start logs, so ordinary values such as a site address stay readable. ${skills} ${skillsList} ${skillsTrust} Moved here from the repository settings, because repositories have no settings for now. The states of the tab are child pages, so this page shows only its canonical screen.`,
  relatedDocs: [],
  movedFrom: 'app/repository-settings',
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
