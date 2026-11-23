import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

/** The decision that gives the setting and its timing. */
const decision =
  'The user chose option B of decision 1 of the org skills repository plan on 13 November 2026: the cloud computer of each workspace copies the skills repository when it starts, and checks it for new commits every 5 minutes. A changed repository reaches each workspace when it starts, as a changed env var does, so the hint under the field says when a change applies.'

/** Why the description says that the repository must be public. */
const publicOnly =
  'The user chose option A of decision 6 of that plan on 16 November 2026: the cloud computer copies the repository with no GitHub token, so only a public repository gives skills, and the description says so before an admin chooses one.'

export const computerSkills = defineScreen({
  title: 'No skills repository',
  description:
    'Cal opens the tab before an admin of Acme chose a skills repository, as every org starts. The Skills section at the end of the tab has an empty Repository field with the placeholder owner/repository, and Save repository is off until the field changes. The description says that agents in every workspace use the skills of the repository and get its updates within minutes, and that the repository must be public. The hint says that a change applies at the next start of each workspace. No repository is saved, so the section lists no skills, and it has no trust switch until the field names a repository.',
  rationale: `${decision} The user changed decision 3 of that plan to option A on 16 November 2026: only the skill folders of the repository load, not a rules file. ${publicOnly} Only an admin sees the field, from decision 2 A of that plan, as app/org-settings/cloud-computer/member/no-skills shows. A new org shows the same empty field, as app/org-settings/cloud-computer/first-build shows. The other states of the section are child pages, so this page shows only its canonical screen.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'none' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
